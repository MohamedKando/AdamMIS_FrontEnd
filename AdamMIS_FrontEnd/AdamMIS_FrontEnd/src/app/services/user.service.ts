import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface UserResponse {
  id: string;
  userName: string;
  isDisabled: boolean;
  roles: string[];
}

export interface CreateUserRequest {
  userName: string;
  password: string;
  roles: string[];
}

export interface UserRoleRequest {
  userId: string;
  roleIds: string[];
}

export interface UserRoleResponse {
  userId: string;
  roleId: string;
  roleName: string;
  assignedBy: string;
  assignedAt: Date;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
}

export interface Result<T> {
  isSuccess: boolean;
  data?: T;
  error?: {
    code: string;
    description: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'https://localhost:7209/api/User'; // Replace with your actual API URL

  constructor(private http: HttpClient) { }

  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}`)
      .pipe(
        map(users => this.normalizeUsers(users)),
        catchError(this.handleError)
      );
  }

  getUsersWithRoles(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/users-with-roles`)
      .pipe(
        map(users => this.normalizeUsers(users)),
        catchError((error) => {
          // If users-with-roles endpoint doesn't exist, fallback to regular users endpoint
          console.warn('users-with-roles endpoint not available, falling back to regular users endpoint');
          return this.getAllUsers();
        })
      );
  }

  getAllBannedUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.apiUrl}/banned-users`)
      .pipe(
        map(users => this.normalizeUsers(users.filter(user => user.isDisabled))),
        catchError((error) => {
          // If banned-users endpoint doesn't exist, get all users and filter
          console.warn('banned-users endpoint not available, filtering from all users');
          return this.getAllUsers().pipe(
            map(users => users.filter(user => user.isDisabled))
          );
        })
      );
  }

  addUser(request: CreateUserRequest): Observable<Result<UserResponse>> {
    // Ensure the request is properly formatted
    const normalizedRequest = {
      ...request,
      roles: Array.isArray(request.roles) ? request.roles : []
    };

    return this.http.post<Result<UserResponse>>(`${this.apiUrl}`, normalizedRequest)
      .pipe(
        catchError(this.handleError)
      );
  }

  toggleUserStatus(userId: string): Observable<Result<any>> {
    if (!userId) {
      return throwError(() => new Error('User ID is required'));
    }

    return this.http.put<Result<any>>(`${this.apiUrl}/${userId}`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  assignRolesToUser(request: UserRoleRequest): Observable<Result<UserRoleResponse[]>> {
    if (!request.userId || !Array.isArray(request.roleIds)) {
      return throwError(() => new Error('Invalid role assignment request'));
    }

    return this.http.post<Result<UserRoleResponse[]>>(`${this.apiUrl}/role-user/assign`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  removeRoleFromUser(request: UserRoleRequest): Observable<Result<any>> {
    if (!request.userId || !Array.isArray(request.roleIds)) {
      return throwError(() => new Error('Invalid role removal request'));
    }

    return this.http.put<Result<any>>(`${this.apiUrl}/role-remove`, request)
      .pipe(
        catchError(this.handleError)
      );
  }

  getAllRoles(): Observable<Role[]> {
    // Try multiple possible endpoints for roles
    return this.http.get<Role[]>(`${this.apiUrl}/roles`)
      .pipe(
        map(roles => this.normalizeRoles(roles)),
        catchError((error) => {
          console.warn('Roles endpoint at /api/User/roles not available, trying alternative endpoints');
          
          // Try alternative role endpoints
          return this.http.get<Role[]>(`https://localhost:7209/api/Role`)
            .pipe(
              map(roles => this.normalizeRoles(roles)),
              catchError((altError) => {
                console.error('Could not load roles from any endpoint:', altError);
                // Return empty array if no roles endpoint is available
                return new Observable<Role[]>(observer => {
                  observer.next([]);
                  observer.complete();
                });
              })
            );
        })
      );
  }

  private normalizeUsers(users: any[]): UserResponse[] {
    if (!Array.isArray(users)) {
      console.warn('Expected array of users, got:', users);
      return [];
    }

    return users.map(user => ({
      id: user.id || '',
      userName: user.userName || user.username || '',
      isDisabled: Boolean(user.isDisabled || user.disabled || user.isBanned),
      roles: Array.isArray(user.roles) ? user.roles : 
             (user.roles ? [user.roles] : [])
    }));
  }

  private normalizeRoles(roles: any[]): Role[] {
    if (!Array.isArray(roles)) {
      console.warn('Expected array of roles, got:', roles);
      return [];
    }

    return roles.map(role => ({
      id: role.id || role.roleId || '',
      name: role.name || role.roleName || ''
    })).filter(role => role.id && role.name); // Filter out invalid roles
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} - ${error.message}`;
      
      if (error.error && error.error.description) {
        errorMessage = error.error.description;
      }
    }
    
    console.error('HTTP Error:', error);
    return throwError(() => new Error(errorMessage));
  };
}