import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './pages/layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { CustomeInterceptor } from './services/custome.interceptor';
import { NavigationComponent } from './navigation/navigation.component';
import { DmsReportComponent } from './pages/dms-report/dms-report.component';
import { ReportManagementComponent } from './pages/dms-report/report-management/report-management.component';
import { ReportViewingComponent } from './pages/dms-report/report-viewing/report-viewing.component';
import { AuthInterceptor } from './services/auth.interceptor';


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
    
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule

  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass:AuthInterceptor,
      multi:true 
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
