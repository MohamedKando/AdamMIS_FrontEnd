import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

// Interfaces matching your C# contracts
export interface MetabaseResponse {
  id: number;
  url: string;
  title: string;
  createdAt: Date;
  description: string; // Fixed typo: was 'decription'
  createdBy: string;
}

export interface MetabaseRequest {
  url: string;
  title: string;
  description: string;
}

export interface UserMetabaseResponse {
  id: number;
  userId: string;
  userName: string;
  metabaseId: number;
  metabaseTitle: string;
  metabaseUrl: string;
  assignedAt: Date;
  description: string; // Fixed typo: was 'decription'
  assignedBy: string;
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

export interface UserMetabaseRequest {
  metabaseIds: number[];
  userIds: string[];
}

// API Response wrapper (optional, if your API returns wrapped responses)
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MetabaseService {
  private LocalapiUrl = 'https://localhost:7209/api/Metabase';
  private apiUrl = 'http://192.168.1.203:8080/api/Metabase';

  constructor(private http: HttpClient) {}

  // URL Management Methods

  /**
   * Get all URLs
   * GET /api/metabase
   */
  getAllUrls(): Observable<MetabaseResponse[]> {
    return this.http.get<MetabaseResponse[]>(`${this.apiUrl}`)
      .pipe(
        map(response => this.convertDatesToObjects(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Search URLs by title
   * GET /api/metabase/search?title={searchTerm}
   */
  searchUrlsByTitle(searchTerm: string): Observable<MetabaseResponse[]> {
    if (!searchTerm.trim()) {
      return this.getAllUrls();
    }
    
    return this.getAllUrls().pipe(
      map(urls => urls.filter(url => 
        url.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        url.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        url.url.toLowerCase().includes(searchTerm.toLowerCase())
      ))
    );
  }

  /**
   * Create a new URL
   * POST /api/metabase
   */
  createUrl(request: MetabaseRequest): Observable<MetabaseResponse> {
    return this.http.post<MetabaseResponse>(`${this.apiUrl}`, request)
      .pipe(
        map(response => this.convertDateToObject(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing URL
   * PUT /api/metabase/{id}
   */
  updateUrl(id: number, request: MetabaseRequest): Observable<MetabaseResponse> {
    return this.http.put<MetabaseResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(
        map(response => this.convertDateToObject(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a URL
   * DELETE /api/metabase/{id}
   */
  deleteUrl(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  // User-URL Assignment Methods

  /**
   * Get users assigned to a specific URL
   * GET /api/metabase/{metabaseId}/users
   */
  getUrlAssignments(metabaseId: number): Observable<UserMetabaseResponse[]> {
    return this.http.get<UserMetabaseResponse[]>(`${this.apiUrl}/${metabaseId}/users`)
      .pipe(
        map(response => this.convertUserMetabaseDatesToObjects(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get URLs assigned to a specific user
   * GET /api/metabase/users/{userId}
   */
getUserAssignedUrls(userId: string): Observable<UserMetabaseResponse[]> {
  return this.http.get<UserMetabaseResponse[]>(`${this.apiUrl}/users/${userId}`)
    .pipe(
      map(response => this.convertUserMetabaseDatesToObjects(response)),
      catchError(this.handleError)
    );
}

  /**
   * Get all users and their assigned URLs
   * GET /api/metabase/users
   */
  getAllUsersUrls(): Observable<UserMetabaseResponse[]> {
    return this.http.get<UserMetabaseResponse[]>(`${this.apiUrl}/users`)
      .pipe(
        map(response => this.convertUserMetabaseDatesToObjects(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Get all assignments
   * GET /api/metabase/assignments
   */
  getAllAssignments(): Observable<UserMetabaseResponse[]> {
    return this.http.get<UserMetabaseResponse[]>(`${this.apiUrl}/assignments`)
      .pipe(
        map(response => this.convertUserMetabaseDatesToObjects(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Assign URLs to users
   * POST /api/metabase/assign
   */
  assignUrlsToUsers(request: UserMetabaseRequest): Observable<UserMetabaseResponse[]> {
    return this.http.post<UserMetabaseResponse[]>(`${this.apiUrl}/assign`, request)
      .pipe(
        map(response => this.convertUserMetabaseDatesToObjects(response)),
        catchError(this.handleError)
      );
  }

  /**
   * Remove URL assignment from user
   * DELETE /api/metabase/assignments/{userMetabaseId}
   */
  unassignUrlFromUser(userMetabaseId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/assignments/${userMetabaseId}`)
      .pipe(catchError(this.handleError));
  }

  // Convenience Methods

  /**
   * Assign a single URL to a single user
   */
  assignUrlToUser(metabaseId: number, userId: string): Observable<UserMetabaseResponse[]> {
    const request: UserMetabaseRequest = {
      metabaseIds: [metabaseId],
      userIds: [userId]
    };
    return this.assignUrlsToUsers(request);
  }

  /**
   * Assign multiple URLs to a single user
   */
  assignUrlsToSingleUser(metabaseIds: number[], userId: string): Observable<UserMetabaseResponse[]> {
    const request: UserMetabaseRequest = {
      metabaseIds: metabaseIds,
      userIds: [userId]
    };
    return this.assignUrlsToUsers(request);
  }

  /**
   * Assign a single URL to multiple users
   */
  assignSingleUrlToUsers(metabaseId: number, userIds: string[]): Observable<UserMetabaseResponse[]> {
    const request: UserMetabaseRequest = {
      metabaseIds: [metabaseId],
      userIds: userIds
    };
    return this.assignUrlsToUsers(request);
  }

  /**
   * Get assignments for specific URL and user combination
   */
  getAssignmentByUrlAndUser(metabaseId: number, userId: string): Observable<UserMetabaseResponse | null> {
    return this.getUrlAssignments(metabaseId).pipe(
      map(assignments => assignments.find(a => a.userId === userId) || null)
    );
  }

  /**
   * Check if a user has access to a specific URL
   */
  userHasAccessToUrl(metabaseId: number, userId: string): Observable<boolean> {
    return this.getAssignmentByUrlAndUser(metabaseId, userId).pipe(
      map(assignment => assignment !== null)
    );
  }

  /**
   * Get URLs accessible by a specific user
   */
  getUrlsAccessibleByUser(userId: string): Observable<MetabaseResponse[]> {
    return this.getAllAssignments().pipe(
      map(assignments => {
        const userAssignments = assignments.filter(a => a.userId === userId);
        return userAssignments.map(assignment => ({
          id: assignment.metabaseId,
          url: assignment.metabaseUrl,
          title: assignment.metabaseTitle,
          description: assignment.description,
          createdAt: new Date(), // You might want to fetch this from getAllUrls if needed
          createdBy: '' // Same here
        }));
      })
    );
  }

  // User Management Methods

  /**
   * Get all users
   */
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>('http://192.168.1.203:8080/api/User').pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Search users by name
   */
  searchUsersByName(searchTerm: string): Observable<User[]> {
    if (!searchTerm.trim()) {
      return this.getAllUsers();
    }
    
    return this.getAllUsers().pipe(
      map(users => users.filter(user => 
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.department?.name && user.department.name.toLowerCase().includes(searchTerm.toLowerCase()))
      ))
    );
  }

  // Private Helper Methods

  /**
   * Convert string dates to Date objects for MetabaseResponse
   */
  private convertDateToObject(response: any): MetabaseResponse {
    if (response && response.createdAt) {
      response.createdAt = new Date(response.createdAt);
    }
    return response;
  }

  /**
   * Convert string dates to Date objects for MetabaseResponse array
   */
  private convertDatesToObjects(response: any[]): MetabaseResponse[] {
    return response.map(item => this.convertDateToObject(item));
  }

  /**
   * Convert string dates to Date objects for UserMetabaseResponse
   */
  private convertUserMetabaseDateToObject(response: any): UserMetabaseResponse {
    if (response && response.assignedAt) {
      response.assignedAt = new Date(response.assignedAt);
    }
    return response;
  }

  /**
   * Convert string dates to Date objects for UserMetabaseResponse array
   */
  private convertUserMetabaseDatesToObjects(response: any[]): UserMetabaseResponse[] {
    return response.map(item => this.convertUserMetabaseDateToObject(item));
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred!';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.status === 400) {
        errorMessage = 'Bad Request: Please check your input data.';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized: Please log in again.';
      } else if (error.status === 403) {
        errorMessage = 'Forbidden: You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'Not Found: The requested resource was not found.';
      } else if (error.status === 500) {
        errorMessage = 'Internal Server Error: Please try again later.';
      } else {
        errorMessage = `Server Error Code: ${error.status}\nMessage: ${error.message}`;
      }
      
      // Try to extract server error message if available
      if (error.error && typeof error.error === 'string') {
        errorMessage += `\nServer Message: ${error.error}`;
      }
    }

    console.error('MetabaseService Error:', error);
    return throwError(() => new Error(errorMessage));
  }
}