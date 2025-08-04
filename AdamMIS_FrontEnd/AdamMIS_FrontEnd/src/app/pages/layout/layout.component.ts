import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service'; // Add this import

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
  permission?: string;
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
  
  // User menu state
  showUserMenu = false;
  currentUserName = '';
  currentUserRoles: string[] = [];
  currentUserPhoto = ''; // Add this for user photo
  isAdmin = false;
  
  private photoCheckInterval: any; // For periodic photo updates
  
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
          label: 'Report Management', 
          route: '/dms-report/management', 
          permission: 'View Report Manager'
        },
        { 
          label: 'Report Viewing', 
          route: '/dms-report/viewing' 
        }
      ]
    },
    { 
      label: 'Admin Management', 
      icon: 'admin-management', 
      route: '/admin-management',
      hasSubmenu: true,
      permission: 'View Admin Manager',
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
    }
  ];
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private userService: UserService // Add UserService injection
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();
    
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
  }

  // Close user menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (this.userMenuRef && !this.userMenuRef.nativeElement.contains(event.target)) {
      this.showUserMenu = false;
    }
  }

  // Permission and role checks
  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  hasPermission(permission: string): boolean {
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
    // Don't allow submenu expansion when navigation is collapsed
    if (!this.isNavCollapsed) {
      this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
    }
  }

  // Navigation collapse methods
  toggleNavigation(): void {
    this.isNavCollapsed = !this.isNavCollapsed;
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
      'admin-management': '👥'
    };
    return icons[iconType] || '📄';
  }

  // Logout method
  logout(): void {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
      this.router.navigate(['/login']);
    }
  }
}