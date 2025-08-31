import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Response interfaces matching your C# DTOs
export interface RCategoryResponse {
  id: number;
  name: string;
  description: string;
  color: string;
  reportCount?: number;
}

export interface RCategoryRequest {
  name: string;
  description: string;
  color: string;
}

export interface ReportResponse {
  id: number;
  fileName: string;
  filePath: string;
  categoryId: number;
  categoryName: string;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

export interface ReportRequest {
  file: File;
  categoryId: number;
}

export interface UserReportResponse {
  id: number;
  userId: string;
  userName: string;
  reportId: number;
  reportFileName: string;
  categoryName: string;
  assignedAt: Date;
  assignedBy: string;
  isActive: boolean;
}

export interface UserReportRequest {
  userIds: string[];
  reportIds: number[];
}

export interface User {
  id: string;
  userName: string;
  email?: string;
      departmentId?: number;
  department?: {
    id: number;
    name: string;
  };
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
  data?: any;
}

// Updated interface for generate report response to match your C# endpoint
export interface GenerateReportResponse {
  message: string;
  reportId: number;
  fileName: string;
  generatedAt: string; // ISO date string
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = 'http://192.168.1.203:8080/api/Reports';
  private LocalapiUrl = 'https://localhost:7209/api/Reports';
  
  constructor(private http: HttpClient) {}

  // ===========================================
  // CATEGORY MANAGEMENT METHODS
  // ===========================================

  /**
   * Get all categories
   * GET /api/Reports/categories
   */
  getAllCategories(): Observable<RCategoryResponse[]> {
    return this.http.get<RCategoryResponse[]>(`${this.apiUrl}/categories`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get category by ID
   * GET /api/Reports/categories/{id}
   */
  getCategoryById(id: number): Observable<RCategoryResponse> {
    return this.http.get<RCategoryResponse>(`${this.apiUrl}/categories/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Create new category
   * POST /api/Reports/categories
   */
  createCategory(category: RCategoryRequest): Observable<RCategoryResponse> {
    return this.http.post<RCategoryResponse>(`${this.apiUrl}/categories`, category).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Update category
   * PUT /api/Reports/categories/{id}
   */
  updateCategory(id: number, category: RCategoryRequest): Observable<RCategoryResponse> {
    return this.http.put<RCategoryResponse>(`${this.apiUrl}/categories/${id}`, category).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Delete category
   * DELETE /api/Reports/categories/{id}
   */
  deleteCategory(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/categories/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===========================================
  // REPORT MANAGEMENT METHODS
  // ===========================================

  /**
   * Get all reports
   * GET /api/Reports/reports
   */
  getAllReports(): Observable<ReportResponse[]> {
    return this.http.get<ReportResponse[]>(`${this.apiUrl}/reports`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get report by ID
   * GET /api/Reports/reports/{id}
   */
  getReportById(id: number): Observable<ReportResponse> {
    return this.http.get<ReportResponse>(`${this.apiUrl}/reports/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get reports by category
   * GET /api/Reports/reports/category/{categoryId}
   */
  getReportsByCategory(categoryId: number): Observable<ReportResponse[]> {
    return this.http.get<ReportResponse[]>(`${this.apiUrl}/reports/category/${categoryId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Upload report with progress tracking
   * POST /api/Reports/reports/upload
   */
  uploadReport(file: File, categoryId: number): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('CategoryId', categoryId.toString());

    return this.http.post<ReportResponse>(`${this.apiUrl}/reports/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              return {
                progress,
                status: 'uploading' as const,
                message: `Uploading file... ${progress}%`
              };
            }
            return {
              progress: 0,
              status: 'uploading' as const,
              message: 'Starting upload...'
            };

          case HttpEventType.Response:
            if (event.body) {
              return {
                progress: 100,
                status: 'completed' as const,
                message: 'Report uploaded successfully!',
                data: event.body
              };
            }
            return {
              progress: 100,
              status: 'completed' as const,
              message: 'Report uploaded successfully!'
            };

          default:
            return {
              progress: 50,
              status: 'processing' as const,
              message: 'Processing report...'
            };
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Generate report from .rpt file with progress tracking
   * POST /api/Reports/generate-report (if you still have a file upload endpoint)
   */
  generateReport(rptFile: File): Observable<UploadProgress> {
    // Validate file type before sending
    const allowedExtensions = ['.rpt'];
    const fileExtension = rptFile.name.toLowerCase().substring(rptFile.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return throwError(() => new Error('Only .rpt files are allowed.'));
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (rptFile.size > maxFileSize) {
      return throwError(() => new Error('File size exceeds the maximum limit of 10MB.'));
    }

    const formData = new FormData();
    formData.append('rptFile', rptFile);

    return this.http.post<GenerateReportResponse>(`${this.apiUrl}/generate-report`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<any>) => {
        switch (event.type) {
          case HttpEventType.UploadProgress:
            if (event.total) {
              const progress = Math.round(100 * event.loaded / event.total);
              return {
                progress: progress < 90 ? progress : 90, // Reserve 10% for processing
                status: 'uploading' as const,
                message: `Uploading .rpt file... ${progress}%`
              };
            }
            return {
              progress: 0,
              status: 'uploading' as const,
              message: 'Starting upload...'
            };

          case HttpEventType.Response:
            if (event.body) {
              return {
                progress: 100,
                status: 'completed' as const,
                message: event.body.message || 'Report generated successfully!',
                data: event.body
              };
            }
            return {
              progress: 100,
              status: 'completed' as const,
              message: 'Report generated successfully!'
            };

          default:
            return {
              progress: 90,
              status: 'processing' as const,
              message: 'Processing report with ReportGenerator...'
            };
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Generate report - Simple version without progress tracking
   * POST /api/Reports/generate-report
   */
  generateReportSimple(rptFile: File): Observable<GenerateReportResponse> {
    // Validate file type before sending
    const allowedExtensions = ['.rpt'];
    const fileExtension = rptFile.name.toLowerCase().substring(rptFile.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return throwError(() => new Error('Only .rpt files are allowed.'));
    }

    // Validate file size (10MB limit)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (rptFile.size > maxFileSize) {
      return throwError(() => new Error('File size exceeds the maximum limit of 10MB.'));
    }

    const formData = new FormData();
    formData.append('rptFile', rptFile);

    return this.http.post<GenerateReportResponse>(`${this.apiUrl}/generate-report`, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate report from existing report ID
   * POST /api/Reports/reports/{reportId}/generate
   */
  generateReportById(reportId: number): Observable<GenerateReportResponse> {
    return this.http.post<GenerateReportResponse>(`${this.apiUrl}/reports/${reportId}/generate`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generate report from existing report ID with progress simulation
   * POST /api/Reports/reports/{reportId}/generate
   */
  generateReportByIdWithProgress(reportId: number): Observable<UploadProgress> {
    return new Observable(observer => {
      // Simulate progress during generation
      observer.next({
        progress: 0,
        status: 'processing',
        message: 'Initializing report generation...'
      });

      // Simulate progress steps
      const progressSteps = [
        { progress: 20, message: 'Validating report file...' },
        { progress: 40, message: 'Starting ReportGenerator.exe...' },
        { progress: 60, message: 'Processing report data...' },
        { progress: 80, message: 'Generating output...' },
        { progress: 90, message: 'Finalizing report...' }
      ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          observer.next({
            progress: progressSteps[currentStep].progress,
            status: 'processing',
            message: progressSteps[currentStep].message
          });
          currentStep++;
        } else {
          clearInterval(progressInterval);
          // Make the actual API call
          this.generateReportById(reportId).subscribe({
            next: (response) => {
              observer.next({
                progress: 100,
                status: 'completed',
                message: response.message || 'Report generated successfully!',
                data: response
              });
              observer.complete();
            },
            error: (error) => {
              observer.next({
                progress: 0,
                status: 'error',
                message: error.message || 'Report generation failed'
              });
              observer.error(error);
            }
          });
        }
      }, 500); // Update every 500ms
    });
  }

  /**
   * Delete report
   * DELETE /api/Reports/reports/{id}
   */
  deleteReport(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/reports/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===========================================
  // USER REPORT ASSIGNMENT METHODS
  // ===========================================

  /**
   * Get reports assigned to a specific user
   * GET /api/Reports/user-reports/user/{userId}
   */
  getUserReports(userId: string): Observable<UserReportResponse[]> {
    return this.http.get<UserReportResponse[]>(`${this.apiUrl}/user-reports/user/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get users assigned to a specific report
   * GET /api/Reports/user-reports/report/{reportId}
   */
  getReportUsers(reportId: number): Observable<UserReportResponse[]> {
    return this.http.get<UserReportResponse[]>(`${this.apiUrl}/user-reports/report/${reportId}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Assign reports to users
   * POST /api/Reports/user-reports/assign
   */
  assignReportsToUsers(request: UserReportRequest): Observable<UserReportResponse[]> {
    return this.http.post<UserReportResponse[]>(`${this.apiUrl}/user-reports/assign`, request).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Remove user report assignment
   * DELETE /api/Reports/user-reports/{userReportId}
   */
  removeUserReportAssignment(userReportId: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.apiUrl}/user-reports/${userReportId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Get all users (assuming you have a user endpoint)
   * You might need to update this URL to match your user API
   */
  getAllUsers(): Observable<User[]> {
    // Update this URL to match your actual user API endpoint
    return this.http.get<User[]>('http://192.168.1.203:8080/api/User').pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Clear all reports (for testing)
   * DELETE /api/Reports/ClearAll
   */
  clearAllReports(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/ClearAll`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Test API connection
   */
  testConnection(): Observable<any> {
    return this.http.get(`${this.apiUrl}/categories`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Generic error handler
   */
  private handleError = (error: HttpErrorResponse) => {
  console.error('API Error:', error);
  let errorMessage = 'An error occurred';
  
  if (error.error instanceof ErrorEvent) {
    // Client-side error
    errorMessage = error.error.message;
  } else {
    // Server-side error - safely handle different error types
    if (error.error && typeof error.error === 'string') {
      errorMessage = error.error;
    } else if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Error: ${error.status} - ${error.statusText || 'Unknown error'}`;
    }
    
    // Convert error message to string for safe includes() check
    const errorStr = errorMessage.toString().toLowerCase();
    
    // Handle specific error cases from your C# endpoint
    if (error.status === 404) {
      if (errorStr.includes('report not found')) {
        errorMessage = 'Report not found in database';
      } else if (errorStr.includes('report file not found')) {
        errorMessage = 'Report file not found on server';
      } else if (errorStr.includes('reportgenerator.exe not found')) {
        errorMessage = 'Report generator application not found';
      }
    } else if (error.status === 400) {
      if (errorStr.includes('invalid report file type')) {
        errorMessage = 'Invalid report file type. Only .rpt files are supported.';
      }
    } else if (error.status === 500) {
      if (errorStr.includes('timed out')) {
        errorMessage = 'Report generation timed out. Please try again.';
      } else if (errorStr.includes('report generation failed')) {
        errorMessage = 'Report generation failed. Please check the report file.';
      }
    }
  }
  
  return throwError(() => new Error(errorMessage));
};
editReport(reportId: number): Observable<any> {
  return this.http.post(`${this.apiUrl}/reports/${reportId}/edit`, {});
}
  getAllUserReports(): Observable<UserReportResponse[]> {
    return this.http.get<UserReportResponse[]>(`${this.apiUrl}/user-reports/users`);
  }
}