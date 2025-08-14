import { Component, OnInit, OnDestroy } from '@angular/core';
import { LogService, ActivityLogs, RequestFilters, LogResponse } from '../../../services/log.service';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';



@Component({
  selector: 'app-activity-logs',
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css']
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  activityLogs: ActivityLogs[] = [];
  onlineUsers: ActivityLogs[] = [];
  offlineUsers: ActivityLogs[] = [];
  loading = true;
  error: string | null = null;
  
  // Stats
  totalUsers = 0;
  onlineCount = 0;
  offlineCount = 0;
  
  // Filters
  searchTerm = '';
  showOnlineOnly = false;
  showOfflineOnly = false;

  constructor(private logService: LogService) {}

  ngOnInit(): void {
    this.loadActivityLogs();
    
    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadActivityLogs();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadActivityLogs(): void {
    this.loading = true;
    this.error = null;

    this.logService.getActivityLogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (logs) => {
          this.activityLogs = logs;
          this.processLogs();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to load activity logs';
          this.loading = false;
          console.error('Error loading activity logs:', err);
        }
      });
  }

  private processLogs(): void {
    this.onlineUsers = this.activityLogs.filter(log => log.isOnline);
    this.offlineUsers = this.activityLogs.filter(log => !log.isOnline);
    
    this.totalUsers = this.activityLogs.length;
    this.onlineCount = this.onlineUsers.length;
    this.offlineCount = this.offlineUsers.length;
  }

  get filteredUsers(): ActivityLogs[] {
    let filtered = this.activityLogs;

    // Apply online/offline filter
    if (this.showOnlineOnly) {
      filtered = filtered.filter(user => user.isOnline);
    } else if (this.showOfflineOnly) {
      filtered = filtered.filter(user => !user.isOnline);
    }

    // Apply search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.userName.toLowerCase().includes(term) ||
        user.userId.toLowerCase().includes(term) ||
        (user.ipAddress && user.ipAddress.toLowerCase().includes(term))
      );
    }

    return filtered.sort((a, b) => {
      // Online users first, then sort by last activity time
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return new Date(b.lastActivityTime).getTime() - new Date(a.lastActivityTime).getTime();
    });
  }

formatDuration(sessionTime: string): string {
  if (!sessionTime || sessionTime.trim() === '' || sessionTime === '00:00:00') {
    return 'N/A';
  }
  
  try {
    let timeString = sessionTime.trim();
    
    // Handle TimeSpan format: HH:mm:ss.fffffff
    const parts = timeString.split(':');
    
    if (parts.length >= 3) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      
      // Handle seconds with milliseconds (ss.fffffff)
      const secondsPart = parts[2].split('.')[0];
      const seconds = parseInt(secondsPart, 10) || 0;
      
      // Format the output based on the actual values
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      } else if (seconds > 0) {
        return `${seconds}s`;
      } else {
        return 'Less than 1s';
      }
    }
    
    // Fallback for HH:mm format
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10) || 0;
      const minutes = parseInt(parts[1], 10) || 0;
      
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `${minutes}m`;
      } else {
        return 'Less than 1m';
      }
    }
    
  } catch (error) {
    console.error('Failed to parse session time:', sessionTime, error);
  }
  
  return sessionTime; // Return original if parsing fails
}

  formatLastActivity(lastActivityTime: string): string {
    const now = new Date();
    const lastActivity = new Date(lastActivityTime);
    const diffInMs = now.getTime() - lastActivity.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return lastActivity.toLocaleDateString();
    }
  }

  refreshData(): void {
    this.loadActivityLogs();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.showOnlineOnly = false;
    this.showOfflineOnly = false;
  }

  setOnlineFilter(): void {
    this.showOnlineOnly = true;
    this.showOfflineOnly = false;
  }

  setOfflineFilter(): void {
    this.showOfflineOnly = true;
    this.showOnlineOnly = false;
  }

  showAll(): void {
    this.showOnlineOnly = false;
    this.showOfflineOnly = false;
  }
}