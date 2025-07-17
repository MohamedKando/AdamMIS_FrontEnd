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

  registerModel = {
    userName: '',
    password: ''
  };

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.model.userName || !this.model.password) {
      alert('Please fill in all fields');
      return;
    }

    this.authService.login(this.model).subscribe({
      next: (res: any) => {
        console.log('Login Success', res);
        
        // Store the JWT token from the response
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('UserName', res.userName);
          localStorage.setItem('id', res.id);
          
          alert('Login successful!');
          this.router.navigate(['/dashboard']);
        } else {
          alert('Login failed: No token received');
        }
      },
      error: (err: any) => {
        console.error('Login error:', err);
        if (err.status === 401) {
          alert('Invalid username or password');
        } else if (err.status === 400) {
          alert('Please check your input');
        } else {
          alert('Login failed. Please try again.');
        }
      }
    });
  }

  onRegister() {
    if (!this.registerModel.userName || !this.registerModel.password) {
      alert('Please fill in username and password');
      return;
    }

    this.authService.register(this.registerModel).subscribe({
      next: (res: any) => {
        console.log('Registration Success', res);
        alert('Registration successful! You can now login.');
        
        // Clear the form
        this.registerModel = {
          userName: '',
          password: ''
        };
        
        // Switch to login form
        const checkbox = document.getElementById('chk') as HTMLInputElement;
        if (checkbox) checkbox.checked = false;
      },
      error: (err: any) => {
        console.error('Registration error:', err);
        if (err.status === 400) {
          alert('Registration failed: User might already exist or invalid data');
        } else {
          alert('Registration failed. Please try again.');
        }
      }
    });
  }
}