import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://localhost:7209';

  constructor(private http: HttpClient) { }

  login(credentials: { userName: string; password: string }): Observable<any> {
    console.log('Sending login request to API...', credentials);
    return this.http.post(`${this.apiUrl}/Auth`, credentials);
  }

  register(userData: { userName: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, userData);
  }

  // Token management methods
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    return token !== null && !this.isTokenExpired(token);
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() > expiry;
    } catch (e) {
      return true; // If token is malformed, consider it expired
    }
  }
getUserId(): string {
  try {
    const token = localStorage.getItem('token'); // Changed from 'auth_token' to 'token'
    if (!token) {
      return '';
    }

    const payload = this.decodeJwtPayload(token);
    // Check for common JWT user ID fields
    return payload?.userId || payload?.id || payload?.sub || payload?.nameid || ''; 
  } catch (error) {
    console.error('Error getting user ID:', error);
    return '';
  }
}

/**
 * Get user name from JWT token
 */
getUserName(): string {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return '';
    }

    const payload = this.decodeJwtPayload(token);
    return payload?.userName || payload?.name || payload?.unique_name || '';
  } catch (error) {
    console.error('Error getting user name:', error);
    return '';
  }
}

/**
 * Decode JWT payload
 * @param token - JWT token
 * @returns any - Decoded payload or null
 */
decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT payload:', error);
    return null;
  }
}
getUserRoles(): string[] {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }

    const payload = this.decodeJwtPayload(token);
    // Your JWT has roles as an array
    return payload?.roles || [];
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
}

/**
 * Get user permissions from JWT token  
 */
getUserPermissions(): string[] {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return [];
    }

    const payload = this.decodeJwtPayload(token);
    return payload?.permissions || [];
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific role
 */
hasRole(role: string): boolean {
  const userRoles = this.getUserRoles();
  return userRoles.includes(role);
}

/**
 * Check if user has any of the specified roles
 */
hasAnyRole(roles: string[]): boolean {
  const userRoles = this.getUserRoles();
  return roles.some(role => userRoles.includes(role));
}

/**
 * Check if user has specific permission
 */
hasPermission(permission: string): boolean {
  const userPermissions = this.getUserPermissions();
  return userPermissions.includes(permission);
}

/**
 * Check if user is SuperAdmin
 */
isSuperAdmin(): boolean {
  return this.hasRole('SuperAdmin');
}
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('UserName');
    localStorage.removeItem('id');
  }
}