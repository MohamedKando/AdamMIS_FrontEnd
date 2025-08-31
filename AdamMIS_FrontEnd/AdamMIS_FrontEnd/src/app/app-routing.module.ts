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
import { UserProfileComponent } from './pages/user-profile/user-profile.component';
import { LogsComponent } from './pages/Audiuts/action-logs/logs.component';
import { AuthGuard } from './guards/auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { AuditsComponent } from './pages/Audiuts/audits.component';
import { ActivityLogsComponent } from './pages/Audiuts/activity-logs/activity-logs.component';
import { MetabaseComponent } from './pages/dms-report/metabase/metabase.component';
import { TicketsGlpiComponent } from './pages/tickets-glpi/tickets-glpi.component';
import { ChatComponent } from './pages/chat/chat/chat.component'; // Add this import
import { EmployeeFormComponent } from './pages/employee/employee-form/employee-form.component';
import {EmployeeListComponent} from './pages/employee/employee-list/employee-list.component';



const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'chat',
        component: ChatComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'dms-report',
        component: DmsReportComponent,
        children: [
          {
            path: 'management',
            component: ReportManagementComponent,
            canActivate: [AuthGuard, PermissionGuard],
            data: { permission: 'View Report Manager' } 
          },
          {
            path: 'metabase',
            component: MetabaseComponent,
            canActivate: [AuthGuard, PermissionGuard],
            data: { permission: 'View Report Manager' } 
          },
          {
            path: 'viewing',
            component: ReportViewingComponent,
            canActivate: [AuthGuard]
          },
          {
            path: '',
            redirectTo: 'management',
            pathMatch: 'full'
          }
        ]
      },
      // MOVE EMPLOYEE ROUTES HERE - INSIDE LayoutComponent children
      {
        path: 'employees',
        component: EmployeeListComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'employees/form',
        component: EmployeeFormComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'employees/form/:id',
        component: EmployeeFormComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'employees/form/:id/:step',
        component: EmployeeFormComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'admin-management',
        component: AdminManagementComponent,
        canActivate: [AuthGuard, PermissionGuard],
        children: [
          {
            path: '',
            redirectTo: 'user-management',
            pathMatch: 'full'
          },
          {
            path: 'user-management',
            component: UserManagementComponent,
            canActivate: [AuthGuard]
          },
          {
            path: 'role-management',
            component: RoleManagementComponent,
            canActivate: [AuthGuard]
          },
          {
            path: 'users/:id/profile',
            component: UserProfileComponent,
            canActivate: [AuthGuard]
          }
        ]
      },
      {
        path: 'profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard]
      },
      {
        path: 'action-logs',
        component: LogsComponent,
      },
      {
        path: 'audits',
        component: AuditsComponent,
        children: [
          {
            path: 'action-logs',
            component: LogsComponent,
            canActivate: [AuthGuard, PermissionGuard],
            data: { permission: 'View System Logs' } 
          },
          {
            path: 'activity-logs',
            component: ActivityLogsComponent,
            canActivate: [AuthGuard, PermissionGuard],
            data: { permission: 'View Activity Logs' } 
          },
          {
            path: '',
            redirectTo: 'activity-logs',
            pathMatch: 'full'
          }
        ]
      },
      {
        path: 'tickets',
        component: TicketsGlpiComponent,
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