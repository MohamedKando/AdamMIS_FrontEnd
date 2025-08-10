import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { LogService, ActivityLog, RequestFilters, LogResponse } from '../../services/log.service';

@Component({
  selector: 'app-logs',
  templateUrl: './logs.component.html',
  styleUrls: ['./logs.component.css']
})
export class LogsComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  logs: ActivityLog[] = [];
  loading = false;
  totalCount = 0;
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;
  
  // Toast notification properties
  showToast = false;
  toastMessage = '';
  
  private destroy$ = new Subject<void>();

  actionTypes = [
    { value: '', label: 'All Actions' },
    { value: 'Create', label: 'Create' },
    { value: 'Update', label: 'Update' },
    { value: 'Delete', label: 'Delete' },
    { value: 'Login', label: 'Login' },
    { value: 'Logout', label: 'Logout' },
    { value: 'Reset', label: 'Reset' },
    { value: 'Assign', label: 'Assign' },
    { value: 'Unassign', label: 'Unassign' }
  ];

  expandedLogs = new Set<number>();

  constructor(
    private fb: FormBuilder,
    private logService: LogService
  ) {
    this.filterForm = this.fb.group({
      username: [''],
      actionType: [''],
      startDate: [''],
      endDate: ['']
    });
  }

  ngOnInit(): void {
    this.loadLogs();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupFormSubscriptions(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadLogs();
      });
  }

  loadLogs(): void {
    this.loading = true;
    const formValue = this.filterForm.value;
    
    const filters: RequestFilters = {
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'timestamp',
      sortOrder: 'desc'
    };

    // Validate date range
    if (formValue.startDate && formValue.endDate) {
      if (!this.logService.validateDateRange(formValue.startDate, formValue.endDate)) {
        this.showToastMessage('End date must be after start date');
        this.loading = false;
        return;
      }
    }

    this.logService.getLogs(
      formValue.username?.trim() || undefined,
      formValue.actionType || undefined,
      formValue.startDate || undefined,
      formValue.endDate || undefined,
      filters
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: LogResponse) => {
        this.logs = response.items || [];
        this.totalCount = response.totalCount || 0;
        this.totalPages = response.totalPages || 0;
        this.currentPage = response.pageNumber || 1;
        this.loading = false;
        
        // Clear expanded logs when new data is loaded
        this.expandedLogs.clear();
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.logs = [];
        this.totalCount = 0;
        this.totalPages = 0;
        this.loading = false;
        this.showToastMessage('Failed to load activity logs. Please try again.');
      }
    });
  }

  refresh(): void {
    this.showToastMessage('Refreshing activity logs...');
    this.loadLogs();
  }

  // Enhanced export function with proper error handling
export(): void {
  this.loading = true;
  const formValue = this.filterForm.value;
  
  // Get ALL records with the same filters but larger page size
  const exportFilters: RequestFilters = {
    pageNumber: 1,
    pageSize: Math.max(this.totalCount, 10000), // Get all records
    sortBy: 'timestamp',
    sortOrder: 'desc'
  };

  this.logService.getLogs(
    formValue.username?.trim() || undefined,
    formValue.actionType || undefined,
    formValue.startDate || undefined,
    formValue.endDate || undefined,
    exportFilters
  ).pipe(takeUntil(this.destroy$))
  .subscribe({
    next: (response: LogResponse) => {
      this.loading = false;
      
      if (response.items && response.items.length > 0) {
        const csvContent = this.convertLogsToCSV(response.items);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        this.downloadFile(blob);
        this.showToastMessage(`Export completed successfully (${response.items.length} records)`);
      } else {
        this.showToastMessage('No data to export');
      }
    },
    error: (error) => {
      console.error('Error getting logs for export:', error);
      this.loading = false;
      this.showToastMessage('Export failed. Please try again.');
    }
  });
}

// Method to convert logs to CSV format
private convertLogsToCSV(logs: ActivityLog[]): string {
  if (!logs || logs.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Username',
    'Action Type',
    'Entity Name',
    'Entity ID',
    'Description',
    'Timestamp',
    'IP Address',
    'Old Values',
    'New Values'
  ];

  // Convert each log to CSV row
  const csvRows = logs.map(log => {
    return [
      log.id?.toString() || '',
      this.escapeCSVField(log.username || ''),
      this.escapeCSVField(log.actionType || ''),
      this.escapeCSVField(log.entityName || ''),
      this.escapeCSVField(log.entityId || ''),
      this.escapeCSVField(log.description || ''),
      this.escapeCSVField(this.formatDate(log.timestamp) || ''),
      this.escapeCSVField(log.ipAddress || ''),
      this.escapeCSVField(this.formatJsonForCSV(log.oldValues) || ''),
      this.escapeCSVField(this.formatJsonForCSV(log.newValues) || '')
    ];
  });

  // Combine headers and data rows
  const allRows = [headers, ...csvRows];
  
  // Convert to CSV string with proper line breaks
  return allRows.map(row => row.join(',')).join('\r\n');
}

// Helper method to properly escape CSV fields
private escapeCSVField(field: string): string {
  if (!field) return '';
  
  // Convert to string if not already
  const fieldStr = String(field);
  
  // If field contains comma, quote, newline, or carriage return, wrap in quotes
  if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
    // Escape existing quotes by doubling them, then wrap in quotes
    return '"' + fieldStr.replace(/"/g, '""') + '"';
  }
  
  return fieldStr;
}

// Helper method to format JSON for CSV (flatten complex objects)
private formatJsonForCSV(jsonString: string | null): string {
  if (!jsonString) return '';
  
  try {
    const parsed = JSON.parse(jsonString);
    // Convert JSON object to a readable string format for CSV
    return JSON.stringify(parsed).replace(/"/g, '""'); // Escape quotes for CSV
  } catch (error) {
    // If it's not valid JSON, return as-is but escaped
    return jsonString;
  }
}

// Enhanced downloadFile method (keep your existing one or use this)
private downloadFile(blob: Blob): void {
  try {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with current date and filters
    const timestamp = new Date().toISOString().split('T')[0];
    const formValue = this.filterForm.value;
    let filename = `activity-logs-${timestamp}`;
    
    if (formValue.username?.trim()) {
      filename += `-${formValue.username.trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    if (formValue.actionType) {
      filename += `-${formValue.actionType.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_')}`;
    }
    
    link.download = `${filename}.csv`;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error('Error downloading file:', error);
    this.showToastMessage('Failed to download export file');
  }
}

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  changePageSize(newPageSize: number): void {
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.currentPage = 1;
      this.loadLogs();
    }
  }

  toggleDetails(logId: number): void {
    if (this.expandedLogs.has(logId)) {
      this.expandedLogs.delete(logId);
    } else {
      this.expandedLogs.add(logId);
    }
  }

  isExpanded(logId: number): boolean {
    return this.expandedLogs.has(logId);
  }

  getActionIcon(actionType: string): string {
    const icons: { [key: string]: string } = {
      'Create': 'fas fa-plus-circle',
      'Update': 'fas fa-edit',
      'Delete': 'fas fa-trash-alt',
      'Login': 'fas fa-sign-in-alt',
      'Logout': 'fas fa-sign-out-alt',
      'Reset': 'fas fa-undo',
      'Assign': 'fas fa-link',
      'Unassign': 'fas fa-unlink'
    };
    return icons[actionType] || 'fas fa-info-circle';
  }

  getActionColor(actionType: string): string {
    const colors: { [key: string]: string } = {
      'Create': 'success',
      'Update': 'primary',
      'Delete': 'danger',
      'Login': 'info',
      'Logout': 'warning',
      'Reset': 'warning',
      'Assign': 'info',
      'Unassign': 'secondary'
    };
    return colors[actionType] || 'secondary';
  }

  formatDate(timestamp: string): string {
    if (!timestamp) return 'N/A';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }

  formatJson(jsonString: string | null): string {
    if (!jsonString) return 'No data available';
    
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      return jsonString;
    }
  }

  parseJsonSafely(jsonString: string | null): any {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return jsonString;
    }
  }

  // Enhanced pagination helper
  getPages(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let end = Math.min(this.totalPages, start + maxPagesToShow - 1);
      
      if (end - start + 1 < maxPagesToShow) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  }

  trackByLogId(index: number, item: ActivityLog): number {
    return item.id;
  }

  // Filter management
  hasActiveFilters(): boolean {
    const formValue = this.filterForm.value;
    return !!(formValue.username?.trim() || 
              formValue.actionType || 
              formValue.startDate || 
              formValue.endDate);
  }

  clearFilters(): void {
    this.filterForm.reset({
      username: '',
      actionType: '',
      startDate: '',
      endDate: ''
    });
    this.showToastMessage('Filters cleared');
  }

  // Date filter helpers
  setDateFilter(period: 'today' | 'week' | 'month'): void {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return;
    }
    
    this.filterForm.patchValue({
      startDate: this.toLocalISOString(startDate),
      endDate: this.toLocalISOString(now)
    });
    
    this.showToastMessage(`Filter set to ${period}`);
  }

  private toLocalISOString(date: Date): string {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  }

  // Clipboard functionality
  async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.showToastMessage('Copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showToastMessage('Failed to copy to clipboard');
    }
  }

  // Toast notification helpers
  private showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    
    // Auto-hide toast after 3 seconds
    setTimeout(() => {
      this.hideToast();
    }, 3000);
  }

  hideToast(): void {
    this.showToast = false;
    this.toastMessage = '';
  }

  // Utility method for Math in template
  Math = Math;
}