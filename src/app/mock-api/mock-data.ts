export interface UserProfile {
  id: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  department: string;
  organization: string;
  email: string;
  phoneNumber: string;
  profilePicture: string; // Base64 or URL
}

export interface Geofence {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface AttendanceConfig {
  shiftTime: string;
  allowedGeofence: Geofence;
  wifiSSID: string;
  gpsAccuracyThresholdMeters: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface AttendanceRecord {
  date: string; // YYYY-MM-DD
  shiftTime: string;
  checkInTime: string | null; // HH:MM AM/PM
  checkOutTime: string | null; // HH:MM AM/PM
  status: 'Present' | 'Present (Late Check-in)' | 'Absent' | 'Half Day' | 'On Leave' | 'Weekly Off';
  checkInSelfie: string | null;
  checkOutSelfie: string | null;
  checkInLocation: Location | null;
  checkOutLocation: Location | null;
  checkInGpsStatus: 'success' | 'failed' | null;
  checkOutGpsStatus: 'success' | 'failed' | null;
}

export const INITIAL_USER: UserProfile = {
  id: 'EMP001',
  employeeName: 'John Doe',
  employeeCode: 'GT-2026-0042',
  designation: 'Senior Sustainability Consultant',
  department: 'Environmental Compliance',
  organization: 'GreenTrack Technologies Inc.',
  email: 'johntom@gmail.com',
  phoneNumber: '+1 (555) 234-5678',
  profilePicture: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100%" height="100%" fill="%234A5568"/><circle cx="50" cy="35" r="20" fill="%23EDF2F7"/><path d="M20 85c0-15 10-25 30-25s30 10 30 25z" fill="%23EDF2F7"/><text x="50" y="92" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="%23A0AEC0" text-anchor="middle">EMP001</text></svg>`
};

export const ATTENDANCE_CONFIG: AttendanceConfig = {
  shiftTime: '09:00 AM - 06:00 PM',
  allowedGeofence: {
    latitude: 37.7749,
    longitude: -122.4194,
    radiusMeters: 200
  },
  wifiSSID: 'GreenTrack_HQ_WiFi',
  gpsAccuracyThresholdMeters: 50
};

// Generates attendance history for the past N days, excluding today
export function generateHistory(daysCount: number): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  
  for (let i = daysCount; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Check if weekend
    const dayOfWeek = date.getDay();
    const dateString = date.toISOString().split('T')[0];
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      records.push({
        date: dateString,
        shiftTime: ATTENDANCE_CONFIG.shiftTime,
        checkInTime: null,
        checkOutTime: null,
        status: 'Weekly Off',
        checkInSelfie: null,
        checkOutSelfie: null,
        checkInLocation: null,
        checkOutLocation: null,
        checkInGpsStatus: null,
        checkOutGpsStatus: null
      });
      continue;
    }
    
    // Determine random status
    const rand = Math.random();
    let status: AttendanceRecord['status'] = 'Present';
    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    
    if (rand < 0.05) {
      status = 'Absent';
    } else if (rand < 0.10) {
      status = 'On Leave';
    } else if (rand < 0.25) {
      status = 'Present (Late Check-in)';
      // Late check-in between 9:05 AM and 9:45 AM
      const minutes = Math.floor(Math.random() * 40) + 5;
      checkInTime = `09:${minutes.toString().padStart(2, '0')} AM`;
      // Check out between 6:00 PM and 6:30 PM
      const outMin = Math.floor(Math.random() * 30);
      checkOutTime = `06:${outMin.toString().padStart(2, '0')} PM`;
    } else if (rand < 0.30) {
      status = 'Half Day';
      // In between 8:50 AM and 9:05 AM
      const inMin = Math.floor(Math.random() * 15) - 10;
      if (inMin < 0) {
        checkInTime = `08:${(60 + inMin).toString().padStart(2, '0')} AM`;
      } else {
        checkInTime = `09:${inMin.toString().padStart(2, '0')} AM`;
      }
      // Out at 1:00 PM
      checkOutTime = '01:00 PM';
    } else {
      status = 'Present';
      // On time check-in: 8:45 AM to 8:59 AM
      const minutes = Math.floor(Math.random() * 15) + 45;
      checkInTime = `08:${minutes.toString().padStart(2, '0')} AM`;
      // Check out between 6:00 PM and 6:30 PM
      const outMin = Math.floor(Math.random() * 30);
      checkOutTime = `06:${outMin.toString().padStart(2, '0')} PM`;
    }
    
    const latOffset = (Math.random() - 0.5) * 0.001; // inside geofence
    const lngOffset = (Math.random() - 0.5) * 0.001;
    
    const checkInLocation: Location | null = checkInTime ? {
      latitude: ATTENDANCE_CONFIG.allowedGeofence.latitude + latOffset,
      longitude: ATTENDANCE_CONFIG.allowedGeofence.longitude + lngOffset,
      accuracy: Math.floor(Math.random() * 15) + 5
    } : null;
    
    const checkOutLocation: Location | null = checkOutTime ? {
      latitude: ATTENDANCE_CONFIG.allowedGeofence.latitude + latOffset,
      longitude: ATTENDANCE_CONFIG.allowedGeofence.longitude + lngOffset,
      accuracy: Math.floor(Math.random() * 15) + 5
    } : null;

    records.push({
      date: dateString,
      shiftTime: ATTENDANCE_CONFIG.shiftTime,
      checkInTime,
      checkOutTime,
      status,
      checkInSelfie: checkInTime ? `mock_selfie_${dateString}_in.jpg` : null,
      checkOutSelfie: checkOutTime ? `mock_selfie_${dateString}_out.jpg` : null,
      checkInLocation,
      checkOutLocation,
      checkInGpsStatus: checkInTime ? 'success' : null,
      checkOutGpsStatus: checkOutTime ? 'success' : null
    });
  }
  
  return records;
}
