import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface SubmenuItem {
  label: string;
  route: string;
  requiresSuperAdmin?: boolean; // Optional property
}

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  hasSubmenu?: boolean;
  submenuItems?: SubmenuItem[];
}

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  
  // Add navigation collapse state
  isNavCollapsed = false;
  
  constructor(private router: Router , private authService: AuthService) {}

  isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  hasPermission(permission:string):boolean {
    return this.authService.hasPermission(permission)
  }

  // Track which menu items are expanded
  expandedMenus: { [key: string]: boolean } = {
    'dms-report': false,
    'admin-management': false  // Add this line
  };

  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { 
      label: 'DMS Report', 
      icon: 'report', 
      route: '/dms-report',
      hasSubmenu: true,
      submenuItems: [
        { label: 'Report Management', route: '/dms-report/management', requiresSuperAdmin: true },
        { label: 'Report Viewing', route: '/dms-report/viewing' }
      ]
    },
    { 
      label: 'Admin Management', 
      icon: 'admin-management', 
      route: '/admin-management',
      hasSubmenu: true,
      submenuItems: [
        { label: 'User Management', route: '/admin-management/user-management' },
        { label: 'Role Management', route: '/admin-management/role-management' }
      ]
    }
  ];

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  isSubmenuActive(parentRoute: string): boolean {
    return this.router.url.startsWith(parentRoute + '/');
  }

  toggleSubmenu(menuKey: string) {
    // Don't allow submenu expansion when navigation is collapsed
    if (!this.isNavCollapsed) {
      this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
    }
  }

  // Add navigation toggle method
  toggleNavigation() {
    this.isNavCollapsed = !this.isNavCollapsed;
    // Close all submenus when collapsing navigation
    if (this.isNavCollapsed) {
      Object.keys(this.expandedMenus).forEach(key => {
        this.expandedMenus[key] = false;
      });
    }
  }

  getIcon(iconType: string): string {
    const icons: { [key: string]: string } = {
      'dashboard': '📊',
      'report': '📋',
      'admin-management': '👥'  // Add this line
    };
    return icons[iconType] || '📄';
  }

  toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar?.classList.toggle('mobile-open');
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      // Clear localStorage/sessionStorage
      localStorage.clear();
      sessionStorage.clear();
      
      // Navigate to login
      this.router.navigate(['/login']);
    }
  }
}