import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { UserProfile } from '../mock-api/mock-data';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly TOKEN_KEY = 'gt_auth_token';

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor() {
    this.checkSession();
  }

  private checkSession(): void {
    const token = this.getToken();
    if (token) {
      this.isLoggedInSubject.next(true);
      this.fetchCurrentUser().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
        },
        error: () => {
          this.clearSession();
        }
      });
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  login(usernameOrEmail: string, passwordSecret: string): Observable<any> {
    return this.http.post<any>('/api/login', { username: usernameOrEmail, password: passwordSecret }).pipe(
      tap(response => {
        if (response.success && response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          this.currentUserSubject.next(response.user);
          this.isLoggedInSubject.next(true);
        }
      })
    );
  }

  logout(): void {
    this.clearSession();
  }

  private clearSession(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  private fetchCurrentUser(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/api/user');
  }
}
