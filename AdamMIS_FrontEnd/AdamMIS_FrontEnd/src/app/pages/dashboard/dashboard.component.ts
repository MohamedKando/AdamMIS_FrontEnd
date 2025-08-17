import { Component, OnInit, OnDestroy } from '@angular/core';
import { LogService, ActivityLogs, ActivityStats }  from '../../services/log.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  // User activity data
  activityLogs: ActivityLogs[] = [];
  totalUsers: number = 0;
  onlineUsers: number = 0;
  offlineUsers: number = 0;
  
  // Activity statistics
  activityStats: ActivityStats = {
    totalLogs: 0,
    todayLogs: 0,
    actionBreakdown: {},
    userActivity: [],
    entityBreakdown: {}
  };

  // Loading states
  isLoadingUsers: boolean = true;
  isLoadingStats: boolean = true;
  
  // Auto-refresh subscription
  private refreshSubscription?: Subscription;
  
  // Chart data for activity breakdown
  actionBreakdownData: { name: string; value: number; color: string }[] = [];
  
  constructor(private logService: LogService) {}

  ngOnInit() {
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  private startAutoRefresh() {
    // Refresh data every 30 seconds
    this.refreshSubscription = interval(30000)
      .pipe(switchMap(() => this.loadDashboardData()))
      .subscribe();
  }

  private loadDashboardData() {
    this.loadActivityLogs();
    this.loadActivityStats();
    
    // Return a promise for the auto-refresh subscription
    return Promise.all([
      this.loadActivityLogs(),
      this.loadActivityStats()
    ]);
  }

  private loadActivityLogs() {
    this.isLoadingUsers = true;
    
    return this.logService.getActivityLogs().subscribe({
      next: (logs: ActivityLogs[]) => {
        this.activityLogs = logs;
        this.calculateUserStats();
        this.isLoadingUsers = false;
      },
      error: (error) => {
        console.error('Failed to load activity logs:', error);
        this.isLoadingUsers = false;
        // Set fallback data
        this.activityLogs = [];
        this.calculateUserStats();
      }
    });
  }

  private loadActivityStats() {
    this.isLoadingStats = true;
    
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return this.logService.getActivityStats(lastWeek, today).subscribe({
      next: (stats: ActivityStats) => {
        this.activityStats = stats;
        this.prepareChartData();
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('Failed to load activity stats:', error);
        this.isLoadingStats = false;
      }
    });
  }

  private calculateUserStats() {
    this.totalUsers = this.activityLogs.length;
    this.onlineUsers = this.activityLogs.filter(log => log.isOnline).length;
    this.offlineUsers = this.totalUsers - this.onlineUsers;
  }

  private prepareChartData() {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
    let colorIndex = 0;
    
    this.actionBreakdownData = Object.entries(this.activityStats.actionBreakdown)
      .map(([name, value]) => ({
        name,
        value,
        color: colors[colorIndex++ % colors.length]
      }));
  }

  getCurrentTime(): Date {
    return new Date();
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getLastActivityTime(log: ActivityLogs): string {
    if (!log.lastActivityTime) return 'Never';
    
    const lastActivity = new Date(log.lastActivityTime);
    const now = new Date();
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  }

  getOnlineStatusColor(isOnline: boolean): string {
    return isOnline ? '#2ecc71' : '#95a5a6';
  }

  refreshData() {
    this.loadDashboardData();
  }
}