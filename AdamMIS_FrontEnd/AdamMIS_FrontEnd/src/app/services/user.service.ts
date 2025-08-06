import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators'; // Add this import
// ========== INTERFACES ========== //

export interface CreateUserRequest {
  userName: string;
  password: string;
  departmentName: string;  // Changed from department
  title: string;
  roles: string[];
}
export interface UserResponse {
  id: string;
  userName: string;
  departmentName: string;
  title: string;
  email: string;
  isDisabled: boolean;
  roles: string[];
  photoPath?: string; // Add photo path
    departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
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
export interface UpdateUserProfileRequest {
  userName?: string;
  title?: string;
  department?: string;
  email?: string;
}
export interface UserChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface AdminResetPasswordRequest {
  userId: string;
  newPassword: string;
}

export interface UploadUserPhotoRequest {
  userId: string;
  photo: File;
}

export interface RolesResponse {
  id: string;
  name: string;
  isDeleted: boolean;
  permissionCount?: number; // Add this optional field
}

export interface DepartmentResponse {
  id: string;
  name: string;
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

  getUserProfile(userId: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${userId}`);
  }

  updateUserProfile(userId: string, request: UpdateUserProfileRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/update-profile/${userId}`, request);
  }

  changePassword(request: UserChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, request);
  }

  adminResetPassword(request: AdminResetPasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reset-password`, request);
  }

  // Add this if you create the departments endpoint
  getDepartments(): Observable<DepartmentResponse[]> {
    return this.http.get<DepartmentResponse[]>(`${this.baseUrl}/departments`);
  }
  getDepartmentUsers(departmentId: number): Observable<UserResponse[]> {
  return this.http.get<UserResponse[]>(`${this.baseUrl}/department-users/${departmentId}`);
}

  /** POST upload user photo */
uploadUserPhoto(userId: string, photo: File): Observable<string> {
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('photo', photo);
  
  // Return the Observable with proper mapping
  return this.http.post<{photoPath: string}>(`${this.baseUrl}/UploadPhoto`, formData)
    .pipe(
      map(response => response.photoPath)
    );
}

  /** Helper method to get full photo URL */
  getPhotoUrl(photoPath: string | undefined | null): string {
    if (!photoPath) {
      return 'assets/images/AdamLogo.png'; // Default avatar path
    }
    // Remove leading slash if present and construct full URL
    const cleanPath = photoPath.startsWith('/') ? photoPath.substring(1) : photoPath;
    return `https://localhost:7209/${cleanPath}`;
  }
  
}