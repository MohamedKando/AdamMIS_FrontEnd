import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  
  constructor(private router: Router) {}

  // Track which menu items are expanded
  expandedMenus: { [key: string]: boolean } = {
    'dms-report': false
  };

  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { 
      label: 'DMS Report', 
      icon: 'report', 
      route: '/dms-report',
      hasSubmenu: true,
      submenuItems: [
        { label: 'Report Management', route: '/dms-report/management' },
        { label: 'Report Viewing', route: '/dms-report/viewing' }
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
    this.expandedMenus[menuKey] = !this.expandedMenus[menuKey];
  }

  getIcon(iconType: string): string {
    const icons: { [key: string]: string } = {
      'dashboard': '📊',
      'report': '📋'
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