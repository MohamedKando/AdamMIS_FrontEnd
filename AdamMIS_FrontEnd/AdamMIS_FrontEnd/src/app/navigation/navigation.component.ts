import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.css']
})
export class NavigationComponent {
  
  constructor(private router: Router) {}

  menuItems = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'DMS Report', icon: 'report', route: '/dms-report' }, // Changed icon to 'report' as example
    // Add more menu items as needed
  ];

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
  
}