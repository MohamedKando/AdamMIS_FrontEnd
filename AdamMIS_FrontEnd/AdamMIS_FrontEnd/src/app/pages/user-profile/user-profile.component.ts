import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserResponse, UpdateUserProfileRequest, UserChangePasswordRequest, AdminResetPasswordRequest } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('userPhotoImg') userPhotoImg!: ElementRef<HTMLImageElement>; // Add this

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  adminPasswordForm!: FormGroup;
  
  user: UserResponse | null = null;
  departments: string[] = [];
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;
  
  isAdmin = false;
  isOwnProfile = false;
  isEditing = false;
  isChangingPassword = false;
  isAdminResettingPassword = false;
  isUploadingPhoto = false;
  
  loading = false;
  error = '';
  successMessage = '';
  
  userId!: string;
  currentUserId!: string;
  
  // Add cache busting parameter
  photoCacheBuster = Date.now();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef // Add this
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

  getDefaultPhotoUrl(): string {
    return this.userService.getPhotoUrl(null);
  }

  onImageError(event: any): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.getDefaultPhotoUrl();
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
    this.currentUserId = this.authService.getUserId();
    this.isAdmin = this.authService.hasRole('Admin') || this.authService.hasRole('SuperAdmin');
  }

  getUserIdFromRoute(): void {
    const routeUserId = this.route.snapshot.paramMap.get('id');
    
    if (routeUserId) {
      this.userId = routeUserId;
      this.isOwnProfile = this.userId === this.currentUserId;
    } else {
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
        // Update cache buster when loading profile
        this.photoCacheBuster = Date.now();
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
        this.departments = departments;
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

  // Photo upload methods
  onPhotoSelect(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.error = 'Please select a valid image file (JPEG, PNG, or GIF)';
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        this.error = 'File size must be less than 5MB';
        return;
      }

      this.selectedPhoto = file;
      this.error = '';

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadPhoto(): void {
    if (!this.selectedPhoto) {
      this.error = 'Please select a photo first';
      return;
    }

    this.isUploadingPhoto = true;
    this.error = '';

    this.userService.uploadUserPhoto(this.userId, this.selectedPhoto).subscribe({
      next: (photoPath) => {
        if (this.user) {
          this.user.photoPath = photoPath;
        }
        
        // SOLUTION 1: Update cache buster to force image reload
        this.photoCacheBuster = Date.now();
        
        // SOLUTION 2: Force image reload if ViewChild is available
        if (this.userPhotoImg?.nativeElement) {
          const imgElement = this.userPhotoImg.nativeElement;
          const currentSrc = imgElement.src;
          imgElement.src = '';
          setTimeout(() => {
            imgElement.src = this.getUserPhotoUrl();
          }, 10);
        }
        
        // SOLUTION 3: Trigger change detection
        this.cdr.detectChanges();
        
        this.successMessage = 'Photo uploaded successfully';
        this.selectedPhoto = null;
        this.photoPreview = null;
        this.isUploadingPhoto = false;
        
        // Reset file input
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
      },
      error: (err) => {
        this.error = 'Failed to upload photo';
        this.isUploadingPhoto = false;
        console.error('Error uploading photo:', err);
      }
    });
  }

  cancelPhotoUpload(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // UPDATED: Add cache busting parameter
  getUserPhotoUrl(): string {
    const baseUrl = this.userService.getPhotoUrl(this.user?.photoPath);
    // Add cache buster parameter to force browser to reload the image
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}t=${this.photoCacheBuster}`;
  }

  getPhotoPreviewUrl(): string {
    return this.photoPreview || this.getUserPhotoUrl();
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    this.error = '';
    this.successMessage = '';
    
    if (!this.isEditing) {
      this.populateForm();
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

    console.log('Current photoPath before update:', this.user?.photoPath);

    this.userService.updateUserProfile(this.userId, updateRequest).subscribe({
      next: (updatedUser) => {
        console.log('Server response:', updatedUser);
        console.log('Server returned photoPath:', updatedUser.photoPath);
        
        const currentPhotoPath = this.user?.photoPath;
        this.user = {
          ...updatedUser,
          photoPath: updatedUser.photoPath || currentPhotoPath
        } as UserResponse;
        
        console.log('Final user object photoPath:', this.user.photoPath);
        
        this.successMessage = 'Profile updated successfully';
        this.isEditing = false;
        this.loading = false;
      },
      error: (err) => {
         {
          this.error = err.error.detail || 'Failed to update profile';
        } 
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

    console.log('Making password change request...');
    
    this.userService.changePassword(changePasswordRequest).subscribe({
      next: (response) => {

        
        
        this.successMessage = 'Password changed successfully';
        this.isChangingPassword = false;
        this.passwordForm.reset();
        this.loading = false;
      },
      error: (err) => {

        this.error = err.error.detail || 'Failed to change password';
        this.loading = false;
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
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/admin/users']);
    }
  }

  clearMessages(): void {
    this.error = '';
    this.successMessage = '';
  }

  get usernameErrors() {
    const usernameControl = this.profileForm.get('userName');
    return usernameControl?.errors && usernameControl?.touched;
  }

  getUsernameErrorMessage(): string {
    const usernameControl = this.profileForm.get('userName');
    if (usernameControl?.errors) {
      if (usernameControl.errors['required']) {
        return 'Username is required';
      }
      if (usernameControl.errors['minlength']) {
        return 'Username must be at least 3 characters';
      }
    }
    return '';
  }
}