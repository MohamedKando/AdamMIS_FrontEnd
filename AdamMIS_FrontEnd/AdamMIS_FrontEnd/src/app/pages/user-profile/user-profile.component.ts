import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserResponse, UpdateUserProfileRequest, UserChangePasswordRequest, AdminResetPasswordRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service'; // Assuming you have this

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  adminPasswordForm!: FormGroup;
  
  user: UserResponse | null = null;
  departments: string[] = [];
  
  isAdmin = false;
  isOwnProfile = false;
  isEditing = false;
  isChangingPassword = false;
  isAdminResettingPassword = false;
  
  loading = false;
  error = '';
  successMessage = '';
  
  userId!: string;
  currentUserId!: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.getCurrentUser();
    this.getUserIdFromRoute();
    this.loadDepartments();
  }

  initializeForms(): void {
    this.profileForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      title: [''],
      department: ['']
    });

    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.adminPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmNewPassword: ['', [Validators.required]]
    }, { validators: this.adminPasswordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmNewPassword');
    
    if (newPassword && confirmPassword) {
      return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
    }
    return null;
  }

  adminPasswordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmNewPassword');
    
    if (newPassword && confirmPassword) {
      return newPassword.value === confirmPassword.value ? null : { passwordMismatch: true };
    }
    return null;
  }

  getCurrentUser(): void {
    // Get current user info from auth service
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin');
  }

  getUserIdFromRoute(): void {
    const routeUserId = this.route.snapshot.paramMap.get('id');
    
    if (routeUserId) {
      // Coming from admin user management
      this.userId = routeUserId;
      this.isOwnProfile = this.userId === this.currentUserId;
    } else {
      // Coming from user's own profile access
      this.userId = this.currentUserId;
      this.isOwnProfile = true;
    }
    
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.loading = true;
    this.error = '';
    
    this.userService.getUserProfile(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.populateForm();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load user profile';
        this.loading = false;
        console.error('Error loading user profile:', err);
      }
    });
  }

  loadDepartments(): void {
    this.userService.getDepartments().subscribe({
      next: (departments) => {
        this.departments = departments; // departments is string[] directly
      },
      error: (err) => {
        console.error('Error loading departments:', err);
      }
    });
  }

  populateForm(): void {
    if (this.user) {
      this.profileForm.patchValue({
        userName: this.user.userName,
        email: this.user.email,
        title: this.user.title,
        department: this.user.departmentName
      });
    }
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.error = '';
    this.successMessage = '';
    
    if (!this.isEditing) {
      this.populateForm(); // Reset form if canceling
    }
  }

  togglePasswordChange(): void {
    this.isChangingPassword = !this.isChangingPassword;
    this.passwordForm.reset();
    this.error = '';
    this.successMessage = '';
  }

  toggleAdminPasswordReset(): void {
    this.isAdminResettingPassword = !this.isAdminResettingPassword;
    this.adminPasswordForm.reset();
    this.error = '';
    this.successMessage = '';
  }

  onUpdateProfile(): void {
    if (this.profileForm.valid) {
      this.loading = true;
      this.error = '';
      
      const updateRequest: UpdateUserProfileRequest = {
        userName: this.profileForm.value.userName,
        email: this.profileForm.value.email,
        title: this.profileForm.value.title,
        department: this.profileForm.value.department
      };

      this.userService.updateUserProfile(this.userId, updateRequest).subscribe({
        next: (user) => {
          this.user = user;
          this.successMessage = 'Profile updated successfully';
          this.isEditing = false;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to update profile';
          this.loading = false;
          console.error('Error updating profile:', err);
        }
      });
    }
  }

  onChangePassword(): void {
    if (this.passwordForm.valid) {
      this.loading = true;
      this.error = '';
      
      const changePasswordRequest: UserChangePasswordRequest = {
        oldPassword: this.passwordForm.value.oldPassword,
        newPassword: this.passwordForm.value.newPassword,
        confirmNewPassword: this.passwordForm.value.confirmNewPassword
      };

      this.userService.changePassword(changePasswordRequest).subscribe({
        next: () => {
          this.successMessage = 'Password changed successfully';
          this.isChangingPassword = false;
          this.passwordForm.reset();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to change password';
          this.loading = false;
          console.error('Error changing password:', err);
        }
      });
    }
  }

  onAdminResetPassword(): void {
    if (this.adminPasswordForm.valid) {
      this.loading = true;
      this.error = '';
      
      const resetPasswordRequest: AdminResetPasswordRequest = {
        userId: this.userId,
        newPassword: this.adminPasswordForm.value.newPassword
      };

      this.userService.adminResetPassword(resetPasswordRequest).subscribe({
        next: () => {
          this.successMessage = 'Password reset successfully';
          this.isAdminResettingPassword = false;
          this.adminPasswordForm.reset();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to reset password';
          this.loading = false;
          console.error('Error resetting password:', err);
        }
      });
    }
  }

  goBack(): void {
    if (this.isOwnProfile && !this.route.snapshot.paramMap.get('id')) {
      // User accessed their own profile, go to dashboard or home
      this.router.navigate(['/dashboard']);
    } else {
      // Admin accessed from user management, go back to user management
      this.router.navigate(['/admin/users']);
    }
  }

  clearMessages(): void {
    this.error = '';
    this.successMessage = '';
  }
}