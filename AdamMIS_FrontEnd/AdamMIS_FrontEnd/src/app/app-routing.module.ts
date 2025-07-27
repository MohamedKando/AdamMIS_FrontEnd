import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DmsReportComponent } from './pages/dms-report/dms-report.component';
import { ReportManagementComponent } from './pages/dms-report/report-management/report-management.component';
import { ReportViewingComponent } from './pages/dms-report/report-viewing/report-viewing.component';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { AdminManagementComponent } from './pages/admin-management/admin-management.component';
import {UserManagementComponent} from './pages/admin-management/user-management/user-management.component';
import {RoleManagementComponent} from './pages/admin-management/role-management/role-management.component';

// Import Guards

import { PermissionGuard } from './guards/permission.guard';


const routes: Routes = [
   { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'dms-report',
        component: DmsReportComponent,
        children: [
          {
            path: 'management',
            component: ReportManagementComponent,
            canActivate: [ PermissionGuard],
            data: { permission: 'View Report Manager' } 
          },
          {
            path: 'viewing',
            component: ReportViewingComponent
          },
          {
            path: '',
            redirectTo: 'management',
            pathMatch: 'full'
          }
        ]
      },
      {
    path: 'admin-management',
    component: AdminManagementComponent,
    children: [
      {
        path: '',
        redirectTo: 'user-management',
        pathMatch: 'full'
      },
      {
        path: 'user-management',
        component: UserManagementComponent
      },
      {
        path: 'role-management',
        component: RoleManagementComponent
      }
    ]
  },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }