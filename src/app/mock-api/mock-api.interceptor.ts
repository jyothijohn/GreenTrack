import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';
import { delay, switchMap } from 'rxjs/operators';
import { MockDbService } from './mock-db.service';

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  // Pass through if the request is not for mock endpoints
  if (!req.url.includes('/api/')) {
    return next(req);
  }

  const db = inject(MockDbService);
  
  // Normalize and parse pathname
  let pathname = req.url;
  try {
    const url = new URL(req.url, 'http://localhost');
    pathname = url.pathname;
  } catch (e) {
    // fallback
  }

  const method = req.method.toUpperCase();
  const latency = 600; // Simulated latency in ms to showcase loading state spinners

  // Helper to create successful response
  const makeOk = (body: any): Observable<HttpResponse<any>> => {
    return of(new HttpResponse({ status: 200, body })).pipe(delay(latency));
  };

  // Helper to create error response
  const makeError = (status: number, message: string): Observable<never> => {
    const err = new HttpErrorResponse({
      status,
      statusText: status === 401 ? 'Unauthorized' : (status === 400 ? 'Bad Request' : 'Not Found'),
      error: { success: false, message },
      url: req.url
    });
    
    return of(null).pipe(
      delay(latency),
      switchMap(() => throwError(() => err))
    );
  };

  // 1. Authenticate check for non-login endpoints
  if (pathname !== '/api/login') {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token || !db.isAuthenticated(token)) {
      return makeError(401, 'Unauthorized access. Please login.');
    }
  }

  // 2. Mock routes handling
  if (pathname === '/api/login' && method === 'POST') {
    const body = req.body as any;
    if (!body || (!body.username && !body.email) || !body.password) {
      return makeError(400, 'Username/Email and Password are required.');
    }
    const loginResult = db.login(body.username || body.email, body.password);
    if (loginResult.success) {
      return makeOk(loginResult);
    } else {
      return makeError(401, loginResult.message || 'Invalid credentials');
    }
  }

  if (pathname === '/api/user' && method === 'GET') {
    return makeOk(db.getUserDetails());
  }

  if (pathname === '/api/attendance/config' && method === 'GET') {
    return makeOk(db.getConfig());
  }

  if (pathname === '/api/attendance/today' && method === 'GET') {
    return makeOk(db.getTodayAttendance());
  }

  if (pathname === '/api/attendance/mark' && method === 'POST') {
    const body = req.body as any;
    if (!body || !body.type || !body.timestamp || !body.location) {
      return makeError(400, 'Missing attendance details (type, timestamp, location, selfie, and gpsStatus are required).');
    }
    const markResult = db.markAttendance(
      body.type,
      body.timestamp,
      body.selfie || null,
      body.location,
      body.gpsStatus || 'success'
    );
    return makeOk(markResult);
  }

  if (pathname === '/api/attendance/history' && method === 'GET') {
    let month = '';
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      month = urlObj.searchParams.get('month') || '';
    } catch (e) {
      // fallback
    }

    if (!month) {
      const now = new Date();
      month = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    
    return makeOk(db.getHistory(month));
  }

  if (pathname === '/api/attendance/bulk-sync' && method === 'POST') {
    const body = req.body as any;
    const records = Array.isArray(body) ? body : (body && body.records ? body.records : null);
    if (!records || !Array.isArray(records)) {
      return makeError(400, 'Invalid payload: Array of attendance records is expected.');
    }
    return makeOk(db.bulkSync(records));
  }

  return makeError(404, `Endpoint ${method} ${pathname} not found.`);
};
