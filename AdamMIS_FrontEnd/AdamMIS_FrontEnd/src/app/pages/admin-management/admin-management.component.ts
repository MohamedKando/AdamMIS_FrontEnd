import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-management',
  template: `
    <div class="admin-management-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./admin-management.component.css']
})
export class AdminManagementComponent {
  constructor() { }
}