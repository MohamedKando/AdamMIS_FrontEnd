import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Models/Interfaces
export interface RolesResponse {
  id: string;
  name: string;
  isDeleted: boolean;
  permissionCount?: number; // Add this optional field
}

export interface RolesDetailsResponse {
  id: string;
  name: string;
  isDeleted: boolean;
  permissions: string[];
}

export interface RoleRequest {
  name: string;
  permissions: string[];
}

export interface ApiResult<T> {
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
export class RoleService {
  private readonly baseUrl = 'http://192.168.1.203:8080/api'; // Update this to your actual API URL

  constructor(private http: HttpClient) {}

  // GET /api/Roles - Get all roles
  getAllRoles(includeDisabled: boolean = false): Observable<RolesResponse[]> {
    let params = new HttpParams();
    if (includeDisabled) {
      params = params.set('includeDisabled', 'true');
    }
    
    return this.http.get<RolesResponse[]>(`${this.baseUrl}/Roles`, { params });
  }

  // GET /api/Roles/role-details/{id} - Get role details
  getRoleDetails(roleId: string): Observable<RolesDetailsResponse> {
    return this.http.get<RolesDetailsResponse>(`${this.baseUrl}/Roles/role-details/${roleId}`);
  }

  // POST /api/Roles - Add new role
  addRole(roleRequest: RoleRequest): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Roles`, roleRequest);
  }

  // PUT /api/Roles/{id} - Update role
  updateRole(roleId: string, roleRequest: RoleRequest): Observable<boolean> {
    return this.http.put<boolean>(`${this.baseUrl}/Roles/${roleId}`, roleRequest);
  }

  // PUT /api/Roles/Toggle/{id} - Toggle role status
  toggleRoleStatus(roleId: string): Observable<boolean> {
    return this.http.put<boolean>(`${this.baseUrl}/Roles/Toggle/${roleId}`, {});
  }

  // GET /api/Roles/permissions - Get available permissions
  getAvailablePermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/Roles/permissions`);
  }
}