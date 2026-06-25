import { Injectable } from '@angular/core';
import { 
  UserProfile, 
  AttendanceConfig, 
  AttendanceRecord, 
  INITIAL_USER, 
  ATTENDANCE_CONFIG, 
  generateHistory,
  Location 
} from './mock-data';

@Injectable({
  providedIn: 'root'
})
export class MockDbService {
  private readonly USER_KEY = 'gt_user';
  private readonly CONFIG_KEY = 'gt_config';
  private readonly HISTORY_KEY = 'gt_attendance_history';
  private readonly TOKEN_KEY = 'gt_auth_token';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!localStorage.getItem(this.USER_KEY)) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(INITIAL_USER));
    }
    if (!localStorage.getItem(this.CONFIG_KEY)) {
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(ATTENDANCE_CONFIG));
    }
    if (!localStorage.getItem(this.HISTORY_KEY)) {
      // Seed with 60 days of historical records
      const history = generateHistory(60);
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    }
  }

  // Authentication
  login(usernameOrEmail: string, passwordSecret: string): { success: boolean; token?: string; user?: UserProfile; error?: string } {
    const user = this.getUserDetails();
    // In our mock, accept the seeded user email or code, with password 'password123'
    const normalizedInput = usernameOrEmail.trim().toLowerCase();
    const isUserMatch = normalizedInput === user.email.toLowerCase() || normalizedInput === user.employeeCode.toLowerCase();
    
    if (isUserMatch && passwordSecret === 'password123') {
      const mockToken = 'mock-jwt-token-12345';
      localStorage.setItem(this.TOKEN_KEY, mockToken);
      return {
        success: true,
        token: mockToken,
        user
      };
    }
    
    return {
      success: false,
      error: 'Invalid email/username or password. Hint: Use johntom@gmail.com and password123'
    };
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  isAuthenticated(token: string): boolean {
    const savedToken = localStorage.getItem(this.TOKEN_KEY);
    return !!savedToken && savedToken === token;
  }

  // Get User Details
  getUserDetails(): UserProfile {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : INITIAL_USER;
  }

  // Get Config
  getConfig(): AttendanceConfig {
    const configStr = localStorage.getItem(this.CONFIG_KEY);
    return configStr ? JSON.parse(configStr) : ATTENDANCE_CONFIG;
  }

  // Get Today's Attendance
  getTodayAttendance(): AttendanceRecord {
    const history = this.getHistoryRecords();
    const todayStr = this.getLocalDateString(new Date());
    
    const todayRecord = history.find(r => r.date === todayStr);
    if (todayRecord) {
      return todayRecord;
    }
    
    // Create a new blank record for today if it doesn't exist
    const config = this.getConfig();
    return {
      date: todayStr,
      shiftTime: config.shiftTime,
      checkInTime: null,
      checkOutTime: null,
      status: 'Absent', // default state when not marked
      checkInSelfie: null,
      checkOutSelfie: null,
      checkInLocation: null,
      checkOutLocation: null,
      checkInGpsStatus: null,
      checkOutGpsStatus: null
    };
  }

  // Mark Attendance
  markAttendance(
    type: 'check_in' | 'check_out',
    timestamp: string,
    selfie: string,
    location: Location,
    gpsStatus: 'success' | 'failed'
  ): { success: boolean; record: AttendanceRecord; message: string } {
    const dateObj = new Date(timestamp);
    const dateStr = this.getLocalDateString(dateObj);
    const timeStr = this.formatTime(dateObj);
    
    const history = this.getHistoryRecords();
    const config = this.getConfig();
    
    let recordIndex = history.findIndex(r => r.date === dateStr);
    let record: AttendanceRecord;

    if (recordIndex >= 0) {
      record = { ...history[recordIndex] };
    } else {
      record = {
        date: dateStr,
        shiftTime: config.shiftTime,
        checkInTime: null,
        checkOutTime: null,
        status: 'Absent',
        checkInSelfie: null,
        checkOutSelfie: null,
        checkInLocation: null,
        checkOutLocation: null,
        checkInGpsStatus: null,
        checkOutGpsStatus: null
      };
    }

    if (type === 'check_in') {
      record.checkInTime = timeStr;
      record.checkInSelfie = selfie;
      record.checkInLocation = location;
      record.checkInGpsStatus = gpsStatus;
      
      // Determine late check-in: if check-in is after 09:00 AM (9:00)
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      if (hours > 9 || (hours === 9 && minutes > 0)) {
        record.status = 'Present (Late Check-in)';
      } else {
        record.status = 'Present';
      }
    } else {
      record.checkOutTime = timeStr;
      record.checkOutSelfie = selfie;
      record.checkOutLocation = location;
      record.checkOutGpsStatus = gpsStatus;
      
      // Keep present status, but update status if not checked in (e.g. checked out without check in)
      if (record.status === 'Absent') {
        record.status = 'Half Day'; // Checked out but missed check-in
      }
    }

    if (recordIndex >= 0) {
      history[recordIndex] = record;
    } else {
      history.push(record);
    }

    this.saveHistoryRecords(history);

    return {
      success: true,
      record,
      message: `${type === 'check_in' ? 'Check-in' : 'Check-out'} recorded successfully at ${timeStr}.`
    };
  }

  // Get Monthly History
  getHistory(month: string): { presentCount: number; lateCount: number; absentCount: number; records: AttendanceRecord[] } {
    const history = this.getHistoryRecords();
    
    // Sort records descending by date
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
    
    // Filter by month (YYYY-MM)
    const filtered = sorted.filter(r => r.date.startsWith(month));
    
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    filtered.forEach(r => {
      if (r.status === 'Present') {
        presentCount++;
      } else if (r.status === 'Present (Late Check-in)') {
        presentCount++;
        lateCount++;
      } else if (r.status === 'Absent' && this.isPastDate(r.date)) {
        // Only count past dates as absent, not future dates if initialized
        absentCount++;
      }
    });

    return {
      presentCount,
      lateCount,
      absentCount,
      records: filtered
    };
  }

  // Bulk Sync Offline Attendance
  bulkSync(records: AttendanceRecord[]): { success: boolean; syncedCount: number } {
    const history = this.getHistoryRecords();
    
    records.forEach(newRecord => {
      const idx = history.findIndex(r => r.date === newRecord.date);
      if (idx >= 0) {
        history[idx] = { ...history[idx], ...newRecord };
      } else {
        history.push(newRecord);
      }
    });

    this.saveHistoryRecords(history);

    return {
      success: true,
      syncedCount: records.length
    };
  }

  // Helpers
  private getHistoryRecords(): AttendanceRecord[] {
    const historyStr = localStorage.getItem(this.HISTORY_KEY);
    return historyStr ? JSON.parse(historyStr) : [];
  }

  private saveHistoryRecords(records: AttendanceRecord[]): void {
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(records));
  }

  private getLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatTime(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const strMinutes = minutes.toString().padStart(2, '0');
    const strHours = hours.toString().padStart(2, '0');
    return `${strHours}:${strMinutes} ${ampm}`;
  }

  private isPastDate(dateStr: string): boolean {
    const recordDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recordDate < today;
  }
}
