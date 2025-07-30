import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

// ========== INTERFACES ========== //

export interface CreateUserRequest {
  userName: string;
  password: string;
  roles: string[];
}

export interface UserResponse {
  id: string;
  userName: string;
  isDisabled: boolean;
  roles: string[];
}

export interface UserRoleRequest {
  userId: string;
  roleIds: string[];
}

export interface UserRoleResponse {
  userId: string;
  roles: string[];
}

export interface ApiResult<T> {
  isSuccess: boolean;
  value: T;
  error?: {
    code: string;
    description: string;
  };
}

export interface RolesResponse {
  id: string;
  name: string;
  isDeleted: boolean;
  permissionCount?: number; // Add this optional field
}

// ========== SERVICE ========== //

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'https://localhost:7209/api/User';
  private baseRoleUrl = 'https://localhost:7209/api';

  constructor(private http: HttpClient) {}

  /** GET all users with roles except SuperAdmin */
  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/users-with-roles`);
  }

  /** GET all banned users */
  getBannedUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${this.baseUrl}/banned-users`);
  }

  /** GET user roles by user ID */
  getUserRoles(userId: string): Observable<UserRoleResponse> {
    return this.http.get<UserRoleResponse>(`${this.baseUrl}/${userId}/roles`);
  }

  /** POST new user */
addUser(request: CreateUserRequest): Observable<UserResponse> {
  return this.http.post<UserResponse>(`${this.baseUrl}`, request);
}
  /** PUT toggle ban/unban status */
  toggleUserStatus(userId: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${userId}`, {});
  }

  /** PUT assign/remove roles to user */
  updateUserRoles(request: UserRoleRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/role-update`, request);
  }

  getAllRoles(): Observable<RolesResponse[]> {
    // Always fetch roles without including disabled ones
    return this.http.get<RolesResponse[]>(`${this.baseRoleUrl}/Roles`);
  }
}