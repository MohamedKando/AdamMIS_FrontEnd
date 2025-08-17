import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { NavigationComponent } from './navigation/navigation.component';
import { DmsReportComponent } from './pages/dms-report/dms-report.component';
import { ReportManagementComponent } from './pages/dms-report/report-management/report-management.component';
import { ReportViewingComponent } from './pages/dms-report/report-viewing/report-viewing.component';
import { AuthInterceptor } from './services/auth.interceptor';
import {AdminManagementComponent} from './pages/admin-management/admin-management.component';
import {UserManagementComponent} from './pages/admin-management/user-management/user-management.component';
import {RoleManagementComponent} from './pages/admin-management/role-management/role-management.component';

import { AuthGuard } from './guards/auth.guard';
import { UserProfileComponent } from './pages/user-profile/user-profile.component';

import { ToastComponent } from './Notfications/toast.component';
import { ConfirmationModalComponent } from './Notfications/confirmation-modal.component';
import { NotificationService } from './Notfications/notification.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LogsComponent } from './pages/Audiuts/action-logs/logs.component';
import { AuditsComponent } from './pages/Audiuts/audits.component';
import { JsonDisplayComponent } from './Helpers/json-display/json-display.component';
import { ActivityLogsComponent } from './pages/Audiuts/activity-logs/activity-logs.component';
import { MetabaseComponent } from './pages/dms-report/metabase/metabase.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    DmsReportComponent,
    LayoutComponent,
    DashboardComponent,
    NavigationComponent,
    ReportManagementComponent,
    ReportViewingComponent,
    AdminManagementComponent,
    UserManagementComponent,
    RoleManagementComponent,
    UserProfileComponent,
    ReportManagementComponent,
    ToastComponent,
    ConfirmationModalComponent,
    LogsComponent,
    JsonDisplayComponent,
    AuditsComponent,
    ActivityLogsComponent,
    MetabaseComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    BrowserAnimationsModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true ,
      
    },
    AuthGuard,
    NotificationService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }