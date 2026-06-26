import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AttendanceConfig, AttendanceRecord, Location } from '../mock-api/mock-data';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private http = inject(HttpClient);

  // Get configuration settings (shift info, geofences, accuracy threshold etc)
  getConfig(): Observable<AttendanceConfig> {
    return this.http.get<AttendanceConfig>('/api/attendance/config');
  }

  // Get user's today status
  getTodayAttendance(): Observable<AttendanceRecord> {
    return this.http.get<AttendanceRecord>('/api/attendance/today');
  }

  // Mark check-in or check-out
  markAttendance(
    type: 'check_in' | 'check_out',
    selfie: string | null,
    location: Location,
    gpsStatus: 'success' | 'failed'
  ): Observable<{ success: boolean; record: AttendanceRecord; message: string }> {
    const payload = {
      type,
      timestamp: new Date().toISOString(),
      selfie,
      location,
      gpsStatus
    };
    return this.http.post<{ success: boolean; record: AttendanceRecord; message: string }>(
      '/api/attendance/mark',
      payload
    );
  }

  // Query history logs for a specific month (YYYY-MM)
  getHistory(month: string): Observable<{
    presentCount: number;
    lateCount: number;
    absentCount: number;
    records: AttendanceRecord[];
  }> {
    const params = new HttpParams().set('month', month);
    return this.http.get<{
      presentCount: number;
      lateCount: number;
      absentCount: number;
      records: AttendanceRecord[];
    }>('/api/attendance/history', { params });
  }

  // Sync offline records
  syncOffline(records: AttendanceRecord[]): Observable<{ success: boolean; syncedCount: number }> {
    return this.http.post<{ success: boolean; syncedCount: number }>(
      '/api/attendance/bulk-sync',
      records
    );
  }
}
