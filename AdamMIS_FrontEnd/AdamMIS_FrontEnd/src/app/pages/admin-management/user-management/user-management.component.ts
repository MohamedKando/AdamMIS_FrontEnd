import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  UserService, 
  UserResponse, 
  CreateUserRequest, 
  RolesResponse, 
  UserRoleRequest,
  DepartmentResponse,
  UserPermissionResponse,
  UserPermissionRequest
} from '../../../services/user.service';
import { NotificationService } from '../../../Notfications/notification.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: UserResponse[] = [];
  bannedUsers: UserResponse[] = [];
  allUsersData: UserResponse[] = [];
  roles: RolesResponse[] = [];
  availablePermissions: string[] = [];
  
  activeTab: 'all' | 'banned' = 'all';
  showAddUserModal = false;
  showRolePermissionModal = false; // Combined modal for roles and permissions
  
  // Confirmation modal properties
  showConfirmation = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmButtonText = '';
  pendingAction: (() => void) | null = null;
  departments: DepartmentResponse[] = [];
  selectedUser: UserResponse | null = null;
  selectedUserPermissions: UserPermissionResponse | null = null;
  
  addUserForm: FormGroup;
  rolePermissionForm: FormGroup; // Combined form for roles and permissions
  
  loading = false;
  searchTerm = '';

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private notificationService: NotificationService
  ) {
    this.addUserForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      department: ['', Validators.required],
      title: ['', Validators.nullValidator],
      roles: [[], Validators.required]
    });

    // Combined form for roles and individual permissions
    this.rolePermissionForm = this.fb.group({
      roleIds: [[], Validators.nullValidator],
      individualPermissions: [[], Validators.nullValidator]
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

  loadAvailablePermissions(): void {
    this.userService.getIndividualPermissions().subscribe({
      next: (permissions) => {
        this.availablePermissions = permissions;
        console.log('Available permissions loaded:', permissions);
      },
      error: (error) => {
        console.error('Error loading permissions:', error);
        this.notificationService.showError('Failed to load available permissions.');
      }
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadDepartments();
    this.loadAvailablePermissions();
    console.log('Component initialized');
  }

  loadUsers(): void {
    this.loading = true;
    console.log('Loading users...');
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Users loaded successfully:', users);
        
        this.allUsersData = users.map(user => ({
          ...user,
          roles: Array.isArray(user.roles) ? user.roles : []
        }));
        
        this.updateUserLists();
        this.loading = false;
        
        console.log('Active users:', this.users);
        console.log('Banned users:', this.bannedUsers);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
        this.notificationService.showError('Failed to load users. Please check your connection and try again.');
      }
    });
  }

  private updateUserLists(): void {
    this.users = this.allUsersData.filter(user => !user.isDisabled);
    this.bannedUsers = this.allUsersData.filter(user => user.isDisabled);
  }

  loadRoles(): void {
    console.log('Loading roles...');
    
    this.userService.getAllRoles().subscribe({
      next: (roles) => {
        console.log('Roles loaded successfully:', roles);
        this.roles = roles.filter(role => !role.isDeleted);
        console.log('Active roles:', this.roles);
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.roles = [];
        this.notificationService.showError('Roles could not be loaded. Role management will be limited.');
      }
    });
  }

  onTabChange(tab: 'all' | 'banned'): void {
    console.log('Tab changed to:', tab);
    this.activeTab = tab;
  }

  openAddUserModal(): void {
    this.showAddUserModal = true;
    this.addUserForm.reset();
    this.addUserForm.patchValue({
      userName: '',
      password: '',
      department: '',
      title: '',
      roles: []
    });
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
  }

  onSubmitAddUser(): void {
    if (this.addUserForm.valid) {
      this.loading = true;
      
      const formValues = this.addUserForm.value;
      const request: CreateUserRequest = {
        ...formValues,
        departmentName: formValues.department
      };
      
      delete (request as any).department;
      
      console.log('Adding user:', request);
      
      this.userService.addUser(request).subscribe({
        next: (userData: UserResponse) => {
          console.log('Add user result:', userData);
          this.loading = false;
          
          const newUser: UserResponse = {
            id: userData.id,
            userName: userData.userName,
            isDisabled: userData.isDisabled || false,
            departmentName: userData.departmentName,
            title: userData.title,
            roles: userData.roles || request.roles || []
          };
          
          this.allUsersData.push(newUser);
          this.updateUserLists();
          
          this.closeAddUserModal();
          this.notificationService.showSuccess(`User "${userData.userName}" added successfully!`);
        },
        error: (error) => {
          console.error('Error adding user:', error);
          this.loading = false;
          
          let errorMessage = 'Error adding user. Please check your connection and try again.';
          
          if (error.error) {
            if (error.error.description) {
              errorMessage = error.error.description;
            } else if (error.error.message) {
              errorMessage = error.error.message;
            } else if (typeof error.error === 'string') {
              errorMessage = error.error;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.notificationService.showError(errorMessage);
        }
      });
    } else {
      console.log('Form is invalid:', this.addUserForm.errors);
      Object.keys(this.addUserForm.controls).forEach(key => {
        this.addUserForm.get(key)?.markAsTouched();
      });
      this.notificationService.showError('Please fill in all required fields correctly.');
    }
  }

  showBanConfirmation(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      this.notificationService.showError('Invalid user data. Please refresh the page and try again.');
      return;
    }

    const action = user.isDisabled ? 'unban' : 'ban';
    const actionCapitalized = user.isDisabled ? 'Unban' : 'Ban';
    
    this.confirmationTitle = `${actionCapitalized} User`;
    this.confirmationMessage = `Are you sure you want to ${action} user "${user.userName}"? ${
      user.isDisabled ? 'This will enable the user\'s account.' : 'This action will disable the user\'s account.'
    }`;
    this.confirmButtonText = `${actionCapitalized} User`;
    
    this.pendingAction = () => this.toggleUserStatus(user);
    this.showConfirmation = true;
  }

  onConfirmAction(): void {
    if (this.pendingAction) {
      this.pendingAction();
      this.pendingAction = null;
    }
    this.showConfirmation = false;
  }

  onCancelAction(): void {
    this.pendingAction = null;
    this.showConfirmation = false;
  }

  toggleUserStatus(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      this.notificationService.showError('Invalid user data. Please refresh the page and try again.');
      return;
    }

    console.log('Toggling status for user:', user);
    
    const previousState = user.isDisabled;
    const action = previousState ? 'unbanned' : 'banned';
    
    this.userService.toggleUserStatus(user.id).subscribe({
      next: () => {
        console.log('User status toggled successfully');
        
        const userIndex = this.allUsersData.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          this.allUsersData[userIndex].isDisabled = !previousState;
          this.updateUserLists();
        }
        
        this.notificationService.showSuccess(`User "${user.userName}" ${action} successfully!`);
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        this.notificationService.showError('Error updating user status. Please check your connection and try again.');
      }
    });
  }

  // ========== COMBINED ROLE & PERMISSION MODAL ========== //

  openRolePermissionModal(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      this.notificationService.showError('Invalid user data. Please refresh the page and try again.');
      return;
    }

    this.selectedUser = user;
    this.loading = true;
    
    // Load user permissions first
    this.userService.getUserPermissions(user.id).subscribe({
      next: (userPermissions) => {
        this.selectedUserPermissions = userPermissions;
        this.showRolePermissionModal = true;
        this.loading = false;
        
        console.log('User permissions loaded:', userPermissions);
        console.log('User roles:', user.roles);
        
        // Pre-select current roles
        const userRoleIds: string[] = [];
        if (user.roles && Array.isArray(user.roles)) {
          user.roles.forEach(roleName => {
            const matchingRole = this.roles.find(role => role.name === roleName);
            if (matchingRole) {
              userRoleIds.push(matchingRole.id);
            }
          });
        }
        
        // Pre-populate the form
        this.rolePermissionForm.patchValue({
          roleIds: userRoleIds,
          individualPermissions: userPermissions.individualPermissions || []
        });
        
        console.log('Pre-selected role IDs:', userRoleIds);
        console.log('Pre-selected individual permissions:', userPermissions.individualPermissions);
      },
      error: (error) => {
        console.error('Error loading user permissions:', error);
        this.loading = false;
        this.notificationService.showError('Error loading user data.');
      }
    });
  }

  closeRolePermissionModal(): void {
    this.showRolePermissionModal = false;
    this.selectedUser = null;
    this.selectedUserPermissions = null;
  }

  onSubmitRolePermissions(): void {
    if (this.selectedUser) {
      const formValue = this.rolePermissionForm.value;
      const newRoleIds = formValue.roleIds || [];
      const newIndividualPermissions = formValue.individualPermissions || [];
      
      console.log('Updating roles and permissions for user:', this.selectedUser.id);
      console.log('New role IDs:', newRoleIds);
      console.log('New individual permissions:', newIndividualPermissions);

      this.loading = true;

      // Update roles first, then individual permissions
      const roleRequest: UserRoleRequest = {
        userId: this.selectedUser.id,
        roleIds: newRoleIds
      };

      this.userService.updateUserRoles(roleRequest).subscribe({
        next: () => {
          console.log('User roles updated successfully');
          
          // Update individual permissions
          const permissionRequest: UserPermissionRequest = {
            userId: this.selectedUser!.id,
            permissions: newIndividualPermissions
          };

          this.userService.updateUserPermissions(permissionRequest).subscribe({
            next: () => {
              console.log('User permissions updated successfully');
              
              // Update the local user data
              const newRoleNames = newRoleIds.map((id: string) => {
                const role = this.roles.find(r => r.id === id);
                return role ? role.name : '';
              }).filter((name: string) => name !== '');

              const userIndex = this.allUsersData.findIndex(u => u.id === this.selectedUser!.id);
              if (userIndex !== -1) {
                this.allUsersData[userIndex].roles = newRoleNames;
                this.updateUserLists();
              }

              this.closeRolePermissionModal();
              this.loading = false;
              this.notificationService.showSuccess(`Roles and permissions updated successfully for "${this.selectedUser!.userName}"!`);
            },
            error: (error) => {
              console.error('Error updating user permissions:', error);
              this.loading = false;
              this.notificationService.showError('Error updating user permissions.');
            }
          });
        },
        error: (error) => {
          console.error('Error updating user roles:', error);
          this.loading = false;
          this.notificationService.showError('Error updating user roles.');
        }
      });
    } else {
      this.notificationService.showError('No user selected.');
    }
  }

  onRoleIdCheckboxChange(event: any, roleId: string): void {
    if (!event || !roleId) return;
    
    const roleIds = this.rolePermissionForm.get('roleIds')?.value || [];
    
    if (event.target.checked) {
      if (!roleIds.includes(roleId)) {
        roleIds.push(roleId);
      }
    } else {
      const index = roleIds.indexOf(roleId);
      if (index > -1) {
        roleIds.splice(index, 1);
      }
    }
    
    this.rolePermissionForm.patchValue({ roleIds });
    console.log('Updated role IDs:', roleIds);
  }

  onIndividualPermissionCheckboxChange(event: any, permission: string): void {
    if (!event || !permission) return;
    
    const permissions = this.rolePermissionForm.get('individualPermissions')?.value || [];
    
    if (event.target.checked) {
      if (!permissions.includes(permission)) {
        permissions.push(permission);
      }
    } else {
      const index = permissions.indexOf(permission);
      if (index > -1) {
        permissions.splice(index, 1);
      }
    }
    
    this.rolePermissionForm.patchValue({ individualPermissions: permissions });
    console.log('Updated individual permissions:', permissions);
  }

  isRoleAssigned(roleId: string): boolean {
    if (!this.selectedUser || !this.selectedUser.roles) return false;
    
    const matchingRole = this.roles.find(role => role.id === roleId);
    if (!matchingRole) return false;
    
    return this.selectedUser.roles.includes(matchingRole.name);
  }

  isIndividualPermissionAssigned(permission: string): boolean {
    if (!this.selectedUserPermissions) return false;
    return this.selectedUserPermissions.individualPermissions.includes(permission);
  }

  isPermissionFromRole(permission: string): boolean {
    if (!this.selectedUserPermissions) return false;
    return this.selectedUserPermissions.roleBasedPermissions.includes(permission);
  }

  // ========== EXISTING METHODS (unchanged) ========== //

  get filteredUsers(): UserResponse[] {
    const userList = this.activeTab === 'all' ? this.users : this.bannedUsers;
    
    if (!this.searchTerm.trim()) {
      return userList;
    }
    
    const searchTermLower = this.searchTerm.toLowerCase().trim();
    
    return userList.filter(user => {
      if (!user) return false;
      
      const usernameMatch = user.userName && 
        user.userName.toLowerCase().includes(searchTermLower);
      
      const departmentMatch = user.departmentName &&
        user.departmentName.toLowerCase().includes(searchTermLower);
      
      const titleMatch = user.title &&
        user.title.toLowerCase().includes(searchTermLower);
      
      const rolesMatch = user.roles && Array.isArray(user.roles) &&
        user.roles.some(role => role && role.toLowerCase().includes(searchTermLower));
      
      return usernameMatch || departmentMatch || titleMatch || rolesMatch;
    });
  }

  getRoleNames(user: UserResponse): string {
    if (!user || !user.roles || !Array.isArray(user.roles) || user.roles.length === 0) {
      return 'No roles assigned';
    }
    
    return user.roles.filter(role => role && role.trim()).join(', ') || 'No roles assigned';
  }

  getStatusClass(user: UserResponse): string {
    if (!user) return 'status-unknown';
    return user.isDisabled ? 'status-banned' : 'status-active';
  }

  getStatusText(user: UserResponse): string {
    if (!user) return 'Unknown';
    return user.isDisabled ? 'Banned' : 'Active';
  }
isRoleSelectedForNewUser(roleName: string): boolean {
  const selectedRoles = this.addUserForm.get('roles')?.value || [];
  return selectedRoles.includes(roleName);
}
onRoleCheckboxChange(event: any, roleName: string): void {
  if (!event || !roleName) return;
  
  const currentRoles = this.addUserForm.get('roles')?.value || [];
  let updatedRoles: string[];
  
  if (event.target.checked) {
    // Create new array with the added role (avoid duplicates)
    updatedRoles = currentRoles.includes(roleName) 
      ? currentRoles 
      : [...currentRoles, roleName];
  } else {
    // Create new array without the removed role
    updatedRoles = currentRoles.filter((role: string) => role !== roleName);
  }
  
  // Update the form control with the new array
  this.addUserForm.get('roles')?.setValue(updatedRoles);
  
  console.log('Updated roles for new user:', updatedRoles);
  
  // Mark as dirty/touched for validation
  this.addUserForm.get('roles')?.markAsDirty();
  this.addUserForm.get('roles')?.markAsTouched();
}

  trackByUserId(index: number, user: UserResponse): string {
    return user?.id || index.toString();
  }

  getUserAvatarLetter(user: UserResponse): string {
    if (!user || !user.userName) return '?';
    return user.userName.charAt(0).toUpperCase();
  }

  refreshData(): void {
    console.log('Refreshing data...');
    this.notificationService.showInfo('Refreshing user data...');
    this.loadUsers();
    this.loadRoles();
    this.loadAvailablePermissions();
  }
}