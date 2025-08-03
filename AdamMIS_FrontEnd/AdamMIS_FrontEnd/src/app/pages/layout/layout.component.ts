import { Component, OnInit, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
export class LayoutComponent implements OnInit {
  
  @ViewChild('userMenuRef', { static: false }) userMenuRef!: ElementRef;

  // Navigation state
  isNavCollapsed = false;
  
  // User menu state
  showUserMenu = false;
  currentUserName = '';
  currentUserRoles: string[] = [];
  isAdmin = false;
  
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
  
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserInfo();
    // Also listen for route changes to refresh user info if needed
    this.router.events.subscribe(() => {
      if (this.authService.isLoggedIn()) {
        this.loadUserInfo();
      }
    });
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
// User information loading
loadUserInfo(): void {
  console.log('Loading user info...');
  
  const userName = this.authService.getUserName();
  console.log('Retrieved username from service:', userName);
  
  // Only set to 'User' if we actually have no username
  this.currentUserName = userName || 'User';
  this.currentUserRoles = this.authService.getUserRoles() || [];
  this.isAdmin = this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin');
  
  // Debug logs
  console.log('Final currentUserName:', this.currentUserName);
  console.log('User roles:', this.currentUserRoles);
  console.log('Is admin:', this.isAdmin);
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