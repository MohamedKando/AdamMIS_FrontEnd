import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../Notfications/notification.service';
import { ChatService } from '../../services/chat.service'; // Add this import
import { Subscription } from 'rxjs'; // Add this import

interface SubmenuItem {
  label: string;
  route: string;
  requiresSuperAdmin?: boolean;
  permission?: string;
}

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
  permission?: string[];
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit, OnDestroy {
  
  @ViewChild('userMenuRef', { static: false }) userMenuRef!: ElementRef;


  // Navigation state
  isNavCollapsed = false;
  isHoverExpanded = false;
  
  // User menu state
  showUserMenu = false;
  currentUserName = '';
  currentUserRoles: string[] = [];
  currentUserPhoto = '';
  isAdmin = false;
  
  // Chat state - Add these properties
  showChatMenu = false;
  unreadMessageCount = 0;
  isConnectedToChat = false;
  recentConversations: any[] = [];
  
  // Confirmation modal state for logout
  showLogoutConfirmation = false;
  
  private photoCheckInterval: any;
  private chatSubscriptions: Subscription[] = []; // Add this
  
  // Track which menu items are expanded
  expandedMenus: { [key: string]: boolean } = {
    'dashboard': false,
    'report': false,
    'admin-management': false
  };

menuItems: MenuItem[] = [
  { 
    label: 'Dashboard', 
    icon: 'dashboard', 
    route: '/dashboard' 
  },
  { 
    label: 'DMS Report', 
    icon: 'report', 
    route: '/dms-report',
    hasSubmenu: true,
    submenuItems: [
      { 
        label: 'Crystal Report Management', 
        route: '/dms-report/management', 
        permission: 'View Report Manager'
      },
      { 
        label: 'MB Report Management', 
        route: '/dms-report/metabase', 
        permission: 'View Report Manager'
      },
      { 
        label: 'Report Viewing', 
        route: '/dms-report/viewing' 
      }
    ]
  },
  { 
    label: 'Employees', 
    icon: 'people', 
    route: '/employees',
    hasSubmenu: true,
    submenuItems: [
      { 
        label: 'Employee List', 
        route: '/employees' 
      },
      { 
        label: 'Add Employee', 
        route: '/employees/form' 
      }
    ]
  },
  { 
    label: 'Admin Management', 
    icon: 'admin-management', 
    route: '/admin-management',
    hasSubmenu: true,
    permission: ['View Admin Manager'],
    submenuItems: [
      { 
        label: 'User Management', 
        route: '/admin-management/user-management',
        permission: 'View Admin Manager' 
      },
      { 
        label: 'Role Management', 
        route: '/admin-management/role-management',
        permission: 'View Admin Manager' 
      }
    ]
  },
  { 
    label: 'Audits Logs', 
    icon: 'audit', 
    route: '/audits',
    hasSubmenu: true,
    permission: ['View System Logs',"View Activity Logs"],
    
    submenuItems: [
      { 
        label: 'Action Logs', 
        route: '/audits/action-logs', 
        permission: 'View System Logs'
      },
      { 
        label: 'Activity Logs', 
        route: '/audits/activity-logs',
        permission: 'View Activity Logs'
      }
    ]
  }
];
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private userService: UserService,
    private notificationService: NotificationService,
    private chatService: ChatService // Add this
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    this.initializeChatService(); // Add this
    
    console.log('User permissions:', this.authService.getUserPermissions());
    console.log('Has View MRM permission:', this.hasPermission(['View MRM']));
    console.log('Has View MRM permission (single):', this.hasPermission('View MRM'));
    
    // Listen for route changes and window focus to refresh user info
    this.router.events.subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.loadUserInfo();
      }
    });

    // Refresh user photo when window gains focus (detects changes from other tabs/components)
    window.addEventListener('focus', () => {
      if (this.authService.isLoggedIn()) {
        this.loadUserPhoto();
      }
    });

    // Listen for visibility changes (when user switches tabs and comes back)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.authService.isLoggedIn()) {
        this.loadUserPhoto();
      }
    });

    // Set up periodic photo check (every 30 seconds) - optional
    this.photoCheckInterval = setInterval(() => {
      if (this.authService.isLoggedIn()) {
        this.loadUserPhoto();
      }
    }, 30000);
  }

  ngOnDestroy(): void {
    // Clean up interval
    if (this.photoCheckInterval) {
      clearInterval(this.photoCheckInterval);
    }
    
    // Clean up chat subscriptions
    this.chatSubscriptions.forEach(sub => sub.unsubscribe());
    
    // Disconnect from chat
    this.chatService.stopConnection();
  }

  // Add chat initialization method
  private async initializeChatService(): Promise<void> {
    try {
      // Initialize SignalR connection
      await this.chatService.startConnection();
      this.isConnectedToChat = true;
      
      // Subscribe to conversation updates
      this.chatSubscriptions.push(
        this.chatService.conversations$.subscribe(conversations => {
          this.unreadMessageCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
          this.recentConversations = conversations.slice(0, 3); // Show only last 3 conversations
        })
      );
      
      // Subscribe to connection status
      this.chatSubscriptions.push(
        this.chatService.connectionStatus$.subscribe(status => {
          this.isConnectedToChat = status;
        })
      );
      
      // Load initial conversations
      this.loadRecentConversations();
      
    } catch (error) {
      console.error('Failed to initialize chat service:', error);
      this.isConnectedToChat = false;
    }
  }

  // Add method to load recent conversations
  private loadRecentConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (conversations) => {
        this.chatService.updateConversations(conversations);
      },
      error: (error) => {
        console.error('Error loading conversations:', error);
      }
    });
  }

  // Close menus when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.userMenuRef && !this.userMenuRef.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
    }
    
  }

  // Add chat menu methods
  toggleChatMenu(): void {
 this.router.navigate(['/chat']);
  }

  closeChatMenu(): void {
    this.showChatMenu = false;
  }

  navigateToChat(userId?: string): void {
this.router.navigate(['/chat']);
  }

  // Add method to format conversation time
  getConversationTime(sentAt: Date): string {
    const now = new Date();
    const messageTime = new Date(sentAt);
    const diffInMinutes = Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  }

  // Add method to get user name (you can enhance this with actual user data)
  getUserName(userId: string): string {
    return `User ${userId}`; // You can enhance this with actual user names
  }

  // Sidebar hover methods
  onSidebarMouseEnter(): void {
    if (this.isNavCollapsed) {
      this.isHoverExpanded = true;
    }
  }

  onSidebarMouseLeave(): void {
    this.isHoverExpanded = false;
  }

  // Permission and role checks
  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  hasPermission(permission: string | string[]): boolean {
    return this.authService.hasPermission(permission);
  }

  // User information loading
  loadUserInfo(): void {
    console.log('Loading user info...');
    
    const userName = this.authService.getUserName();
    console.log('Retrieved username from service:', userName);
    
    // Only set to 'User' if we actually have no username
    this.currentUserName = userName || 'User';
    this.currentUserRoles = this.authService.getUserRoles() || [];
    this.isAdmin = this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin');
    
    // Load user photo
    this.loadUserPhoto();
    
    // Debug logs
    console.log('Final currentUserName:', this.currentUserName);
    console.log('User roles:', this.currentUserRoles);
    console.log('Is admin:', this.isAdmin);
  }

  // Load user photo with cache busting
  loadUserPhoto(): void {
    const userId = this.authService.getUserId();
    if (userId) {
      this.userService.getUserProfile(userId).subscribe({
        next: (user) => {
          // Add timestamp to prevent caching issues
          const photoUrl = this.userService.getPhotoUrl(user.photoPath);
          this.currentUserPhoto = user.photoPath ? `${photoUrl}?t=${Date.now()}` : this.getDefaultPhotoUrl();
        },
        error: (err) => {
          console.error('Error loading user photo:', err);
          this.currentUserPhoto = this.getDefaultPhotoUrl();
        }
      });
    } else {
      this.currentUserPhoto = this.getDefaultPhotoUrl();
    }
  }

  // Get default photo URL
  getDefaultPhotoUrl(): string {
    return this.userService.getPhotoUrl(null);
  }

  // Handle image load errors
  onImageError(event: any): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.getDefaultPhotoUrl();
  }

  // User menu methods
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  // Navigation methods
  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeUserMenu(); // Close user menu when navigating
    
    // If navigating to profile, refresh photo after a short delay to catch any updates
    if (route === '/profile') {
      setTimeout(() => {
        this.loadUserPhoto();
      }, 1000);
    }
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  isSubmenuActive(parentRoute: string): boolean {
    return this.router.url.startsWith(parentRoute + '/');
  }

  toggleSubmenu(menuKey: string): void {
    // Allow submenu expansion when navigation is collapsed only if hovering
    if (!this.isNavCollapsed || this.isHoverExpanded) {
      this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
    }
  }

  // Navigation collapse methods
  toggleNavigation(): void {
    this.isNavCollapsed = !this.isNavCollapsed;
    this.isHoverExpanded = false; // Reset hover state when toggling
    
    // Close all submenus when collapsing navigation
    if (this.isNavCollapsed) {
      Object.keys(this.expandedMenus).forEach(key => {
        this.expandedMenus[key] = false;
      });
    }
  }

  toggleSidebar(): void {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('mobile-open');
  }

  // Utility methods
  getIcon(iconType: string): string {
    const icons: { [key: string]: string } = {
      'dashboard': '📊',
      'report': '📋',
      'admin-management': '👥',
      'audit': '👁️'
    };
    return icons[iconType] || '📄';
  }

  // Updated logout method with confirmation modal and toast notifications
  logout(): void {
    // Show confirmation modal instead of browser confirm
    this.showLogoutConfirmation = true;
    this.closeUserMenu(); // Close the user menu
  }

  // Handle logout confirmation - Updated to work with the new AuthService
  onLogoutConfirmed(): void {
    try {
      // Reset the modal visibility first
      this.showLogoutConfirmation = false;
      
      // Call the auth service logout which now handles logging
      this.authService.logout().subscribe({
        next: (response) => {
          // Clear auth data after successful logout tracking
          this.authService.clearAuthData();
          
          // Show success toast
          this.notificationService.showSuccess('Successfully logged out. See you soon!', 2000);
          
          // Navigate to login page
          this.router.navigate(['/login']);
        },
        error: (error: any) => {
          // Even if logging fails, still logout the user
          console.warn('Logout logging failed, but proceeding with logout:', error);
          
          // Clear auth data anyway
          this.authService.clearAuthData();
          
          // Show success toast (since logout still happened)
          this.notificationService.showSuccess('Successfully logged out. See you soon!', 2000);
          
          // Navigate to login page
          this.router.navigate(['/login']);
        }
      });
      
    } catch (error) {
      // Reset modal visibility on error too
      this.showLogoutConfirmation = false;
      
      // Fallback - clear auth data anyway
      this.authService.clearAuthData();
      
      // Show error toast
      this.notificationService.showError('An error occurred during logout. Please try again.', 5000);
      console.error('Logout error:', error);
      
      // Still navigate to login as a fallback
      this.router.navigate(['/login']);
    }
  }

  // Handle logout cancellation
  onLogoutCancelled(): void {
    // Reset the modal visibility
    this.showLogoutConfirmation = false;
    // Show info toast that logout was cancelled
    this.notificationService.showInfo('Logout cancelled', 2000);
  }
}