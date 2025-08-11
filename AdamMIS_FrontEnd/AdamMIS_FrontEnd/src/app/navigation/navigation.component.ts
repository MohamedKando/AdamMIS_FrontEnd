import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  
  isNavCollapsed = false; // Property to track navigation state
  
  constructor(private router: Router) {}

  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'DMS Report', icon: 'report', route: '/dms-report' },
    { label: 'Admin Management', icon: 'admin', route: '/admin-management' },
    { label: 'Audits Logs ', icon: 'audit', route: '/Audits'}
    // Add more menu items as needed
  ];

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  // Method to toggle navigation
  toggleNavigation() {
    this.isNavCollapsed = !this.isNavCollapsed;
  }
}