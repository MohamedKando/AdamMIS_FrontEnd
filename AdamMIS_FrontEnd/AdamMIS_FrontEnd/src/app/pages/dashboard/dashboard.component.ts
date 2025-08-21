import { Component, OnInit, OnDestroy } from '@angular/core';
import { LogService, ActivityLogs, ActivityStats } from '../../services/log.service';
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

interface SystemConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'desktop' | 'web';
  path?: string;
  url?: string;
  permission: string | string[]; // Can be single permission or array of permissions
  color: string;
  order: number;
  enabled: boolean;
  requiresElevatedPermission?: boolean; // For systems requiring special access
}

interface QuickActionConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  queryParams?: any;
  permission: string | string[];
  color: string;
  order: number;
  enabled: boolean;
}

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
  
  // System configurations - easily configurable
  systemConfigs: SystemConfig[] = [
    {
      id: 'h-system',
      name: 'H System',
      description: 'Hospital Management',
      icon: '🏥',
      type: 'desktop',
      path: 'C:\\Program Files\\H-System\\H-System.exe',
      permission: ['View H DMS'], // Multiple permissions (user needs ANY of these)
      color: '#e74c3c',
      order: 1,
      enabled: true
    },
    {
      id: 'f-system',
      name: 'F System',
      description: 'Financial Management',
      icon: '💰',
      type: 'desktop',
      path: 'C:\\Program Files\\F-System\\F-System.exe',
      permission: 'View F DMS', // Single permission
      color: '#f39c12',
      order: 2,
      enabled: true
    },
    {
      id: 'mrm-system',
      name: 'MRM System',
      description: 'Medical Records Management',
      icon: '📋',
      type: 'web',
      url: 'http://192.168.0.135/EMR/MRM_5.2',
      permission: ['View MRM'],
      color: '#3498db',
      order: 3,
      enabled: true
    },
    {
      id: 'amis-system',
      name: 'AMIS System',
      description: 'Web-based Management',
      icon: '🌐',
      type: 'web',
      url: 'http://192.168.1.201/Pages/MainPage.aspx',
      permission: 'View AIMS',
      color: '#2ecc71',
      order: 4,
      enabled: true
    }

  ];













  // Quick actions configurations
  quickActionConfigs: QuickActionConfig[] = [
    {
      id: 'mb-reports',
      title: 'MB Reports',
      description: 'View Your Reports Quickly',
      icon: '📈',
      route: '/dms-report/viewing',
      queryParams: { tab: 'metabase' },
      permission: 'Read Reports',
      color: '#3498db',
      order: 1,
      enabled: true
    },
    {
      id: 'action-logs',
      title: 'Action Logs',
      description: 'Watch What Happened!',
      icon: '📝',
      route: '/audits/action-logs',
      permission: ['View System Logs'],
      color: '#e74c3c',
      order: 2,
      enabled: true
    },
    {
      id: 'activity-logs',
      title: 'Activity Logs',
      description: 'Know More About Users',
      icon: '👤',
      route: '/audits/activity-logs',
      permission: 'View Activity Logs',
      color: '#f39c12',
      order: 3,
      enabled: true
    }
  ];

  // Filtered configurations based on user permissions
  availableSystems: SystemConfig[] = [];
  availableQuickActions: QuickActionConfig[] = [];
  
  constructor(
    private logService: LogService,
    public authService: AuthService // Make public for template access
  ) {}

  ngOnInit() {
    this.filterSystemsByPermissions();
    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Filter systems and quick actions based on user permissions
   */
  private filterSystemsByPermissions() {
    // Filter systems based on permissions
    this.availableSystems = this.systemConfigs
      .filter(system => system.enabled && this.hasPermissionForSystem(system))
      .sort((a, b) => a.order - b.order);

    // Filter quick actions based on permissions
    this.availableQuickActions = this.quickActionConfigs
      .filter(action => action.enabled && this.hasPermissionForAction(action))
      .sort((a, b) => a.order - b.order);

    console.log('Available systems for user:', this.availableSystems.map(s => s.name));
    console.log('Available quick actions for user:', this.availableQuickActions.map(a => a.title));
  }

  /**
   * Check if user has permission to access a system
   */
  private hasPermissionForSystem(system: SystemConfig): boolean {
    // SuperAdmin has access to everything
    /*if (this.authService.isSuperAdmin()) {
      return true;
    }

    // Check if system requires elevated permissions
    if (system.requiresElevatedPermission && !this.authService.hasAnyRole(['Admin', 'SystemManager'])) {
      return false;
    }*/

    // Check permissions
    return this.authService.hasPermission(system.permission);
  }

  /**
   * Check if user has permission to access a quick action
   */
  private hasPermissionForAction(action: QuickActionConfig): boolean {
    // SuperAdmin has access to everything
    if (this.authService.isSuperAdmin()) {
      return true;
    }

    return this.authService.hasPermission(action.permission);
  }

  /**
   * Navigate to a system - handles both desktop and web systems
   */
  navigateToSystem(systemConfig: SystemConfig): void {
    try {
      if (systemConfig.type === 'desktop') {
        this.openDesktopApp(systemConfig);
      } else if (systemConfig.type === 'web') {
        this.openWebSystem(systemConfig);
      }
    } catch (error) {
      console.error(`Failed to navigate to ${systemConfig.name}:`, error);
      alert(`Failed to open ${systemConfig.name}. Please try again or contact support.`);
    }
  }

  /**
   * Opens a desktop application
   */
  private openDesktopApp(systemConfig: SystemConfig): void {
    if (!systemConfig.path) {
      alert(`No path configured for ${systemConfig.name}`);
      return;
    }

    // Check if we're in an Electron environment
    if ((window as any).electronAPI) {
      (window as any).electronAPI.openDesktopApp(systemConfig.path);
    } else {
      console.warn(`Cannot launch desktop application ${systemConfig.name} from web browser`);
      alert(`To launch ${systemConfig.name}, please use the desktop version of this application.`);
    }
  }

  /**
   * Opens a web system in browser
   */
  private openWebSystem(systemConfig: SystemConfig): void {
    if (!systemConfig.url) {
      alert(`No URL configured for ${systemConfig.name}`);
      return;
    }

    window.open(systemConfig.url, '_blank', 'noopener,noreferrer');
  }

  // Existing methods remain the same...
  private startAutoRefresh() {
    this.refreshSubscription = interval(30000)
      .pipe(switchMap(() => this.loadDashboardData()))
      .subscribe();
  }

  private loadDashboardData() {
    this.loadActivityLogs();
    this.loadActivityStats();
    
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
    this.filterSystemsByPermissions(); // Re-filter on refresh in case permissions changed
    this.loadDashboardData();
  }

  /**
   * Add new system configuration at runtime
   */
  addSystemConfig(config: SystemConfig): void {
    this.systemConfigs.push(config);
    this.filterSystemsByPermissions();
  }

  /**
   * Update existing system configuration
   */
  updateSystemConfig(id: string, updates: Partial<SystemConfig>): void {
    const index = this.systemConfigs.findIndex(config => config.id === id);
    if (index !== -1) {
      this.systemConfigs[index] = { ...this.systemConfigs[index], ...updates };
      this.filterSystemsByPermissions();
    }
  }

  /**
   * Remove system configuration
   */
  removeSystemConfig(id: string): void {
    this.systemConfigs = this.systemConfigs.filter(config => config.id !== id);
    this.filterSystemsByPermissions();
  }

  /**
   * Enable/disable system
   */
  toggleSystemEnabled(id: string, enabled: boolean): void {
    this.updateSystemConfig(id, { enabled });
  }

  /**
   * TrackBy functions for ngFor optimization
   */
  trackBySystemId(index: number, system: SystemConfig): string {
    return system.id;
  }

  trackByActionId(index: number, action: QuickActionConfig): string {
    return action.id;
  }

  /**
   * Get user's current permissions (for debugging/admin purposes)
   */
  getUserPermissionInfo(): any {
    return {
      userName: this.authService.getUserName(),
      roles: this.authService.getUserRoles(),
      permissions: this.authService.getUserPermissions(),
      isSuperAdmin: this.authService.isSuperAdmin()
    };
  }

  /**
   * Check if user can access a specific system by ID
   */
  canAccessSystem(systemId: string): boolean {
    const system = this.systemConfigs.find(s => s.id === systemId);
    return system ? this.hasPermissionForSystem(system) : false;
  }

  /**
   * Get all system configurations (for admin purposes)
   */
  getAllSystemConfigs(): SystemConfig[] {
    return this.systemConfigs;
  }

  /**
   * Get available systems for current user
   */
  getAvailableSystems(): SystemConfig[] {
    return this.availableSystems;
  }
}