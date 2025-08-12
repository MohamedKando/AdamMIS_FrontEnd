import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

export interface ActivityLog {
  id: number;
  username: string;
  actionType: string;
  entityName: string;
  entityId: string;
  description: string;
  oldValues: string | null;
  newValues: string | null;
  timestamp: string;
  ipAddress: string;
}

export interface RequestFilters {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LogResponse {
  items: ActivityLog[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivityStats {
  totalLogs: number;
  todayLogs: number;
  actionBreakdown: { [key: string]: number };
  userActivity: { username: string; count: number }[];
  entityBreakdown: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class LogService {
  // Update this URL to match your API endpoint
  private readonly baseUrl = 'http://192.168.1.203:8080/api/Logs';
  private readonly LocalbaseUrl = 'http://192.168.1.203:8080/api/Logs';

  constructor(private http: HttpClient) {}

  getLogs(
    username?: string,
    actionType?: string,
    startDate?: Date | string,
    endDate?: Date | string,
    filters?: RequestFilters
  ): Observable<LogResponse> {
    let params = this.buildQueryParams({
      username,
      actionType,
      startDate,
      endDate,
      filters: filters || { pageNumber: 1, pageSize: 10 }
    });

    return this.http.get<LogResponse>(this.baseUrl, { params })
      .pipe(
        retry(1),
        map(response => this.transformLogResponse(response)),
        catchError(this.handleError<LogResponse>('getLogs', {
          items: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 0
        }))
      );
  }

  getUsers(): Observable<string[]> {
    return this.http.get<{ users: string[] } | string[]>(`${this.baseUrl}/users`)
      .pipe(
        map(response => Array.isArray(response) ? response : (response as any).users || []),
        catchError(this.handleError<string[]>('getUsers', []))
      );
  }

  getActionTypes(): Observable<string[]> {
    return this.http.get<{ actionTypes: string[] } | string[]>(`${this.baseUrl}/action-types`)
      .pipe(
        map(response => Array.isArray(response) ? response : (response as any).actionTypes || []),
        catchError(this.handleError<string[]>('getActionTypes', [
          'Create', 'Update', 'Delete', 'Login', 'Logout', 'Reset', 'Assign', 'Unassign'
        ]))
      );
  }

  exportLogs(
    username?: string,
    actionType?: string,
    startDate?: Date | string,
    endDate?: Date | string,
    filters?: RequestFilters
  ): Observable<Blob> {
    let params = this.buildQueryParams({
      username,
      actionType,
      startDate,
      endDate,
      filters: filters || { pageNumber: 1, pageSize: 10000 } // Large page size for export
    });

    const headers = new HttpHeaders({
      'Accept': 'application/octet-stream'
    });

    return this.http.get(`${this.baseUrl}/export`, {
      params,
      headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Export failed:', error);
        return of(new Blob([''], { type: 'text/csv' }));
      })
    );
  }

  getLogById(id: number): Observable<ActivityLog | null> {
    return this.http.get<ActivityLog>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError<ActivityLog | null>('getLogById', null))
      );
  }

  getLogsByEntity(entityName: string, entityId: string): Observable<ActivityLog[]> {
    let params = new HttpParams()
      .set('entityName', entityName)
      .set('entityId', entityId);

    return this.http.get<ActivityLog[]>(`${this.baseUrl}/entity`, { params })
      .pipe(
        map(response => Array.isArray(response) ? response : []),
        catchError(this.handleError<ActivityLog[]>('getLogsByEntity', []))
      );
  }

  getRecentActivity(limit: number = 10): Observable<ActivityLog[]> {
    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<ActivityLog[]>(`${this.baseUrl}/recent`, { params })
      .pipe(
        map(response => Array.isArray(response) ? response : []),
        catchError(this.handleError<ActivityLog[]>('getRecentActivity', []))
      );
  }

  getActivityStats(
    startDate?: Date | string,
    endDate?: Date | string
  ): Observable<ActivityStats> {
    let params = this.buildQueryParams({ startDate, endDate });

    return this.http.get<ActivityStats>(`${this.baseUrl}/stats`, { params })
      .pipe(
        catchError(this.handleError<ActivityStats>('getActivityStats', {
          totalLogs: 0,
          todayLogs: 0,
          actionBreakdown: {},
          userActivity: [],
          entityBreakdown: {}
        }))
      );
  }

  clearOldLogs(olderThanDays: number): Observable<{ deletedCount: number; message: string }> {
    let params = new HttpParams().set('olderThanDays', olderThanDays.toString());

    return this.http.delete<{ deletedCount: number; message: string }>(`${this.baseUrl}/cleanup`, { params })
      .pipe(
        catchError(this.handleError<{ deletedCount: number; message: string }>('clearOldLogs', { 
          deletedCount: 0, 
          message: 'Failed to clear logs' 
        }))
      );
  }

  private transformLogResponse(response: any): LogResponse {
    if (response && response.items) {
      return {
        items: response.items || [],
        totalCount: response.totalCount || 0,
        pageNumber: response.pageNumber || 1,
        pageSize: response.pageSize || 10,
        totalPages: response.totalPages || Math.ceil((response.totalCount || 0) / (response.pageSize || 10))
      };
    }

    if (Array.isArray(response)) {
      return {
        items: response,
        totalCount: response.length,
        pageNumber: 1,
        pageSize: response.length,
        totalPages: 1
      };
    }

    return {
      items: [],
      totalCount: 0,
      pageNumber: 1,
      pageSize: 10,
      totalPages: 0
    };
  }

  private buildQueryParams(options: any): HttpParams {
    let params = new HttpParams();
    
    // Handle filter parameters (username, actionType, dates)
    if (options.username && options.username.trim()) {
      params = params.set('username', options.username.trim());
    }
    if (options.actionType && options.actionType.trim()) {
      params = params.set('actionType', options.actionType.trim());
    }
    if (options.startDate) {
      const startDate = options.startDate instanceof Date ? options.startDate : new Date(options.startDate);
      params = params.set('startDate', startDate.toISOString());
    }
    if (options.endDate) {
      const endDate = options.endDate instanceof Date ? options.endDate : new Date(options.endDate);
      params = params.set('endDate', endDate.toISOString());
    }

    // Handle RequestFilters object
    const filters = options.filters || {};
    
    // Set default values for pagination if not provided
    const pageNumber = filters.pageNumber || 1;
    const pageSize = filters.pageSize || 10;
    
    params = params.set('filters.pageNumber', pageNumber.toString());
    params = params.set('filters.pageSize', pageSize.toString());
    
    if (filters.sortBy) {
      params = params.set('filters.sortBy', filters.sortBy);
    }
    if (filters.sortOrder) {
      params = params.set('filters.sortOrder', filters.sortOrder);
    }
    
    return params;
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error);
      
      if (error.error instanceof ErrorEvent) {
        console.error('Client-side error:', error.error.message);
      } else {
        console.error(`Server returned code ${error.status}, body was:`, error.error);
      }
      
      return of(result as T);
    };
  }

  validateDateRange(startDate?: Date | string, endDate?: Date | string): boolean {
    if (!startDate || !endDate) return true;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return start <= end;
  }

  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString();
  }
}