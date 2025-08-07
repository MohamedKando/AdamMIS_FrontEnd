import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserResponse, CreateUserRequest, RolesResponse, UserRoleRequest,DepartmentResponse } from '../../../services/user.service';
import { NotificationService } from '../../../Notfications/notification.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: UserResponse[] = [];
  bannedUsers: UserResponse[] = [];
  allUsersData: UserResponse[] = []; // Store all users for real-time filtering
  roles: RolesResponse[] = [];
  
  activeTab: 'all' | 'banned' = 'all';
  showAddUserModal = false;
  showRoleModal = false;
  
  // Confirmation modal properties
  showConfirmation = false;
  confirmationTitle = '';
  confirmationMessage = '';
  confirmButtonText = '';
  pendingAction: (() => void) | null = null;
  departments: DepartmentResponse [] = [];
  selectedUser: UserResponse | null = null;
  
  addUserForm: FormGroup;
  roleForm: FormGroup;
  
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
  department: ['', Validators.required], // Changed from 'departmentName' to 'department'
  title: ['', Validators.nullValidator],
 
  roles: [[], Validators.required]
});

    this.roleForm = this.fb.group({
      roleIds: [[], Validators.required]
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
  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadDepartments();
    console.log('Component initialized');
  }

  loadUsers(): void {
    this.loading = true;
    console.log('Loading users...');
    
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Users loaded successfully:', users);
        
        // Store all users data and ensure roles is always an array
        this.allUsersData = users.map(user => ({
          ...user,
          roles: Array.isArray(user.roles) ? user.roles : []
        }));
        
        // Separate active and banned users
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
        // Filter out deleted roles
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
    department: '', // Changed from 'departmentName' to 'department'
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
    
    // Map the form values to match the expected API format
    const formValues = this.addUserForm.value;
    const request: CreateUserRequest = {
      ...formValues,
      departmentName: formValues.department // Map 'department' to 'departmentName'
    };
    
    // Remove the temporary 'department' field if it exists
    delete (request as any).department;
    
    console.log('Adding user:', request);
    
    this.userService.addUser(request).subscribe({
      next: (userData: UserResponse) => {
        console.log('Add user result:', userData);
        this.loading = false;
        
        // Add the new user to our local data immediately
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
        
        // Handle different types of errors
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
    
    // Show loading state for the specific action
    const previousState = user.isDisabled;
    const action = previousState ? 'unbanned' : 'banned';
    
    this.userService.toggleUserStatus(user.id).subscribe({
      next: () => {
        console.log('User status toggled successfully');
        
        // Update the user status immediately in our local data
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

  openRoleModal(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      this.notificationService.showError('Invalid user data. Please refresh the page and try again.');
      return;
    }

    this.selectedUser = user;
    this.showRoleModal = true;
    
    console.log('Opening role modal for user:', user);
    console.log('User roles:', user.roles);
    console.log('Available roles:', this.roles);
    
    // Pre-select current user roles by matching role names to role IDs
    const userRoleIds: string[] = [];
    
    if (user.roles && Array.isArray(user.roles)) {
      user.roles.forEach(roleName => {
        const matchingRole = this.roles.find(role => role.name === roleName);
        if (matchingRole) {
          userRoleIds.push(matchingRole.id);
        }
      });
    }
    
    console.log('Pre-selected role IDs:', userRoleIds);
    
    this.roleForm.patchValue({
      roleIds: userRoleIds
    });
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedUser = null;
  }

  onSubmitRoles(): void {
    if (this.roleForm.valid && this.selectedUser) {
      const newRoleIds = this.roleForm.value.roleIds;
      
      console.log('Updating roles for user:', this.selectedUser.id);
      console.log('New role IDs:', newRoleIds);

      this.loading = true;

      const request: UserRoleRequest = {
        userId: this.selectedUser.id,
        roleIds: newRoleIds
      };

      this.userService.updateUserRoles(request).subscribe({
        next: () => {
          console.log('User roles updated successfully');
          
          // Update the user's roles in our local data
          const newRoleNames = newRoleIds.map((id: string) => {
            const role = this.roles.find(r => r.id === id);
            return role ? role.name : '';
          }).filter((name: string) => name !== '');

          const userIndex = this.allUsersData.findIndex(u => u.id === this.selectedUser!.id);
          if (userIndex !== -1) {
            this.allUsersData[userIndex].roles = newRoleNames;
            this.updateUserLists();
          }

          this.closeRoleModal();
          this.loading = false;
          this.notificationService.showSuccess(`Roles updated successfully for "${this.selectedUser!.userName}"!`);
        },
        error: (error) => {
          console.error('Error updating user roles:', error);
          this.loading = false;
          this.notificationService.showError('Error updating user roles. Please check your connection and try again.');
        }
      });
    } else {
      console.log('Role form is invalid:', this.roleForm.errors);
      Object.keys(this.roleForm.controls).forEach(key => {
        this.roleForm.get(key)?.markAsTouched();
      });
      this.notificationService.showError('Please select at least one role.');
    }
  }

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

  onRoleCheckboxChange(event: any, roleName: string): void {
    if (!event || !roleName) return;
    
    const roles = this.addUserForm.get('roles')?.value || [];
    
    if (event.target.checked) {
      if (!roles.includes(roleName)) {
        roles.push(roleName);
      }
    } else {
      const index = roles.indexOf(roleName);
      if (index > -1) {
        roles.splice(index, 1);
      }
    }
    
    this.addUserForm.patchValue({ roles });
    console.log('Updated roles for new user:', roles);
  }

  onRoleIdCheckboxChange(event: any, roleId: string): void {
    if (!event || !roleId) return;
    
    const roleIds = this.roleForm.get('roleIds')?.value || [];
    
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
    
    this.roleForm.patchValue({ roleIds });
    console.log('Updated role IDs:', roleIds);
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
  }

  isRoleAssigned(roleId: string): boolean {
    if (!this.selectedUser || !this.selectedUser.roles) return false;
    
    const matchingRole = this.roles.find(role => role.id === roleId);
    if (!matchingRole) return false;
    
    return this.selectedUser.roles.includes(matchingRole.name);
  }
}