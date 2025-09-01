import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmployeeHRRequest {
  employeeNumber: string;
  nameArabic: string;
  nameEnglish: string;
  personalEmail: string;
  contactPhone: string;
  payrollNumber: string;
  departmentId: number;
  isMedical: boolean;
}

export interface EmployeeDepartmentHeadRequest {
  employeeId: string;
  qualification?: string;
  specialty?: string;
  medicalServiceCode?: string;
  doctorStatus?: string;
  seniorDoctorName?: string;
  medicalProfileType?: string;
  systemPermissions: string;
}

export interface EmployeeITRequest {
  employeeId: string;
  internetAccess: boolean;
  externalEmail: boolean;
  internalEmail: boolean;
  filesSharing: string;
  networkId?: string;
  emailId?: string;
}

export interface EmployeeCEORequest {
  employeeId: string;
  ceoSignature?: string;
}

// Updated interface to match the new backend response
export interface UserRoleResponse {
  primaryRole: string;
  allRoles: string[];
  departmentId?: number;
  departmentName?: string;
}

// New interface for user role information (used internally)
export interface UserRoleInfo {
  primaryRole: string;
  allRoles: string[];
  departmentId?: number;
  departmentName?: string;
}

export interface EmployeeResponse {
  id: string;
  employeeNumber: string;
  nameArabic: string;
  nameEnglish: string;
  personalEmail: string;
  contactPhone: string;
  payrollNumber: string;
  departmentId: number;
  departmentName: string;
  isMedical: boolean;
  qualification?: string;
  specialty?: string;
  medicalServiceCode?: string;
  doctorStatus?: string;
  seniorDoctorName?: string;
  medicalProfileType?: string;
  systemPermissions?: string;
  internetAccess?: boolean;
  externalEmail?: boolean;
  internalEmail?: boolean;
  filesSharing?: string;
  networkId?: string;
  emailId?: string;
  ceoSignature?: string;
  currentStep: string;
  status: string;
  hrCompletedAt?: Date;
  hrCompletedBy?: string;
  departmentCompletedAt?: Date;
  departmentCompletedBy?: string;
  itCompletedAt?: Date;
  itCompletedBy?: string;
  ceoCompletedAt?: Date;
  ceoCompletedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface DepartmentResponse {
  id: number;
  name: string;
  headId?: string;
}

export interface WorkflowStatistics {
  [key: string]: number;
}

// New interface for step access verification
export interface StepAccessResponse {
  canAccess: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private readonly apiUrl = 'https://localhost:7209/api/Employees';
  private readonly LocalapiUrl = 'http://192.168.1.203:8080/api/Employees';

  constructor(private http: HttpClient) {}

  // HR Step Methods
  createEmployee(request: EmployeeHRRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/hr/create`, request);
  }

  completeHRStep(employeeId: string): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/hr/${employeeId}/complete`, {});
  }

  // Department Head Step Methods
  updateDepartmentInfo(request: EmployeeDepartmentHeadRequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.apiUrl}/department/update`, request);
  }

  completeDepartmentStep(employeeId: string): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/department/${employeeId}/complete`, {});
  }

  // IT Step Methods
  updateITInfo(request: EmployeeITRequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.apiUrl}/it/update`, request);
  }

  completeITStep(employeeId: string): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/it/${employeeId}/complete`, {});
  }

  // CEO Step Methods
  updateCEOInfo(request: EmployeeCEORequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.apiUrl}/ceo/update`, request);
  }

  completeCEOStep(employeeId: string): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(`${this.apiUrl}/ceo/${employeeId}/complete`, {});
  }

  // Query Methods
  getEmployeeById(id: string): Observable<EmployeeResponse> {
    return this.http.get<EmployeeResponse>(`${this.apiUrl}/${id}`);
  }

  getAllEmployees(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}`);
  }

  getPendingApprovals(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/pending-approvals`);
  }

  getEmployeesByStatus(status: string): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/by-status/${status}`);
  }

  // Updated method - now uses backend filtering
  getEmployeesByStep(step: string): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/employees/step/${step}`);
  }

  getEmployeesByDepartment(departmentId: number): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/by-department/${departmentId}`);
  }

  getNewComers(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/new-comers`);
  }

  getWorkflowStatistics(): Observable<WorkflowStatistics> {
    return this.http.get<WorkflowStatistics>(`${this.apiUrl}/statistics/workflow`);
  }

  getAllDepartments(): Observable<DepartmentResponse[]> {
    return this.http.get<DepartmentResponse[]>(`${this.apiUrl}/departments`);
  }

  canEditStep(employeeId: string, step: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${employeeId}/can-edit-step/${step}`);
  }
  
  // Updated method to return the new UserRoleResponse interface
  getCurrentUserRole(): Observable<UserRoleResponse> {
    return this.http.get<UserRoleResponse>(`${this.apiUrl}/current-user-role`);
  }

  // ========== NEW METHODS FOR MULTI-ROLE SYSTEM ==========

  // Get user's full role information
  getUserRoleInfo(): Observable<UserRoleInfo> {
    return this.http.get<UserRoleInfo>(`${this.apiUrl}/current-user-role`);
  }

  // Check if user can access a specific step
  canUserAccessStep(stepName: string): Observable<StepAccessResponse> {
    return this.http.get<StepAccessResponse>(`${this.apiUrl}/user/can-access-step/${stepName}`);
  }

  // Get employees for a step filtered by current user's permissions
  getEmployeesForUserByStep(stepName: string): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/employees/step/${stepName}/for-current-user`);
  }

  // Check if current user can edit a specific employee in a specific step
  canEditEmployeeInStep(employeeId: string, stepName: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${employeeId}/can-edit-step/${stepName}/current-user`);
  }

  // Get statistics filtered by user permissions
  getWorkflowStatisticsForUser(): Observable<WorkflowStatistics> {
    return this.http.get<WorkflowStatistics>(`${this.apiUrl}/statistics/workflow/for-current-user`);
  }

  // Get all departments accessible by current user (useful for department heads)
  getAccessibleDepartments(): Observable<DepartmentResponse[]> {
    return this.http.get<DepartmentResponse[]>(`${this.apiUrl}/departments/accessible`);
  }

  // Get employees in current user's department (for department heads)
  getMyDepartmentEmployees(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/employees/my-department`);
  }

  // Check if current user is authorized for multiple roles
  getUserAuthorizations(): Observable<{ [key: string]: boolean }> {
    return this.http.get<{ [key: string]: boolean }>(`${this.apiUrl}/user/authorizations`);
  }

  // Get pending employees specifically for current user's role and department
  getMyPendingEmployees(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(`${this.apiUrl}/employees/my-pending`);
  }

  // ========== UTILITY METHODS ==========

  // Helper method to check if user has a specific role (client-side)
  hasRole(userRoles: string[], targetRole: string): boolean {
    return userRoles.includes(targetRole);
  }

  // Helper method to check if user has any of the specified roles
  hasAnyRole(userRoles: string[], targetRoles: string[]): boolean {
    return targetRoles.some(role => userRoles.includes(role));
  }

  // Helper method to get user's primary role display name
  getPrimaryRoleDisplayName(primaryRole: string, departmentName?: string): string {
    if (departmentName && (primaryRole === 'HR' || primaryRole === 'IT' || primaryRole === 'CEO')) {
      return `${primaryRole} Head (${departmentName})`;
    }
    if (departmentName && primaryRole === 'DepartmentHead') {
      return `${departmentName} Head`;
    }
    return primaryRole;
  }

  // Helper method to format multiple roles for display
  formatRolesForDisplay(roles: string[], departmentName?: string): string {
    if (roles.length === 1) {
      return this.getPrimaryRoleDisplayName(roles[0], departmentName);
    }
    
    const formattedRoles = roles.map(role => {
      if (role === 'DepartmentHead' && departmentName) {
        return `${departmentName} Head`;
      }
      return role;
    });
    
    return formattedRoles.join(' & ');
  }
}