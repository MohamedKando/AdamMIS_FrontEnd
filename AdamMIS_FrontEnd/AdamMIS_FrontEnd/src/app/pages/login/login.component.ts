import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  model = {
    userName: '',
    password: ''
  };

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;
  hospitalName: string = 'Adam International Hospital'; // Update this with your hospital name
  hasCustomLogo: boolean = true; // Set to false if you don't have a custom logo

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    this.clearMessages();

    if (!this.model.userName || !this.model.password) {
      this.showError('Please fill in all fields');
      return;
    }

    this.isLoading = true;

    this.authService.login(this.model).subscribe({
      next: (res: any) => {
        console.log('Login Success', res);
        
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('UserName', res.userName);
          localStorage.setItem('id', res.id);
          
          this.showSuccess('Login successful! Redirecting...');
          
          setTimeout(() => {
            this.router.navigate(['/dashboard']);
          }, 1500);
        } else {
          this.showError('Login failed: No token received');
        }
        
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Login error:', err);
        this.isLoading = false;
        
        if (err.status === 401) {
          this.showError('Invalid username or password');
        } else if (err.status === 400) {
          this.showError('Please check your input');
        } else if (err.status === 0) {
          this.showError('Unable to connect to server. Please try again.');
        } else {
          this.showError('Login failed. Please try again.');
        }
      }
    });
  }

  onForgotPassword(event: Event) {
    event.preventDefault();
    // Implement forgot password functionality
    this.showError('Forgot password functionality will be implemented soon.');
  }

  private showError(message: string) {
    this.errorMessage = message;
    this.successMessage = '';
    this.clearMessagesAfterDelay();
  }

  private showSuccess(message: string) {
    this.successMessage = message;
    this.errorMessage = '';
    this.clearMessagesAfterDelay();
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  private clearMessagesAfterDelay() {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }
}