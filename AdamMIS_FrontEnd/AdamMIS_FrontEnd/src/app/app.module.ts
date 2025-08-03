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
    UserProfileComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true ,
      
    },
    AuthGuard
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }