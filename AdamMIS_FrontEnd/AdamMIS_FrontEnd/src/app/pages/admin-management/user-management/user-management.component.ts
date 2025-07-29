import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserResponse, CreateUserRequest, Role, UserRoleRequest } from '../../../services/user.service';

@Component({
  selector: 'app-user-management',
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: UserResponse[] = [];
  bannedUsers: UserResponse[] = [];
  roles: Role[] = [];
  
  activeTab: 'all' | 'banned' = 'all';
  showAddUserModal = false;
  showRoleModal = false;
  showDeleteConfirm = false;
  
  selectedUser: UserResponse | null = null;
  userToDelete: UserResponse | null = null;
  
  addUserForm: FormGroup;
  roleForm: FormGroup;
  
  loading = false;
  searchTerm = '';

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.addUserForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      roles: [[], Validators.required]
    });

    this.roleForm = this.fb.group({
      roleIds: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    console.log('Component initialized');
  }

  loadUsers(): void {
    this.loading = true;
    console.log('Loading users...');
    
    // Use getUsersWithRoles to get users with their roles properly populated
    this.userService.getUsersWithRoles().subscribe({
      next: (users) => {
        console.log('Users loaded successfully:', users);
        
        // Separate active and banned users
        this.users = users.filter(user => !user.isDisabled).map(user => ({
          ...user,
          roles: Array.isArray(user.roles) ? user.roles : []
        }));
        
        this.bannedUsers = users.filter(user => user.isDisabled).map(user => ({
          ...user,
          roles: Array.isArray(user.roles) ? user.roles : []
        }));
        
        this.loading = false;
        console.log('Active users:', this.users);
        console.log('Banned users:', this.bannedUsers);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loading = false;
        alert('Failed to load users. Please check your connection and try again.');
      }
    });
  }

  loadBannedUsers(): void {
    // This method is now handled in loadUsers() above
    // But we'll keep it for consistency with the template
    if (this.bannedUsers.length === 0) {
      this.loadUsers();
    }
  }

  loadRoles(): void {
    console.log('Loading roles...');
    
    this.userService.getAllRoles().subscribe({
      next: (roles) => {
        console.log('Roles loaded successfully:', roles);
        this.roles = Array.isArray(roles) ? roles : [];
        
        // Ensure each role has required properties
        this.roles = this.roles.map(role => ({
          id: role.id || '',
          name: role.name || ''
        }));
      },
      error: (error) => {
        console.error('Error loading roles:', error);
        this.roles = [];
        console.warn('Roles could not be loaded. Role management will be limited.');
      }
    });
  }

  onTabChange(tab: 'all' | 'banned'): void {
    console.log('Tab changed to:', tab);
    this.activeTab = tab;
    
    // Always ensure we have fresh data
    if (this.users.length === 0 || this.bannedUsers.length === 0) {
      this.loadUsers();
    }
  }

  openAddUserModal(): void {
    this.showAddUserModal = true;
    this.addUserForm.reset();
    this.addUserForm.patchValue({
      userName: '',
      password: '',
      roles: []
    });
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
  }

  onSubmitAddUser(): void {
    if (this.addUserForm.valid) {
      this.loading = true;
      const request: CreateUserRequest = this.addUserForm.value;
      
      console.log('Adding user:', request);
      
      this.userService.addUser(request).subscribe({
        next: (result) => {
          console.log('Add user result:', result);
          
          if (result.isSuccess) {
            this.loadUsers(); // Reload to get updated lists
            this.closeAddUserModal();
            alert('User added successfully!');
          } else {
            alert(`Error: ${result.error?.description || 'Unknown error occurred'}`);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error adding user:', error);
          alert('Error adding user. Please check your connection and try again.');
          this.loading = false;
        }
      });
    } else {
      console.log('Form is invalid:', this.addUserForm.errors);
      Object.keys(this.addUserForm.controls).forEach(key => {
        this.addUserForm.get(key)?.markAsTouched();
      });
    }
  }

  toggleUserStatus(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      alert('Invalid user data. Please refresh the page and try again.');
      return;
    }

    console.log('Toggling status for user:', user);
    this.loading = true;
    
    this.userService.toggleUserStatus(user.id).subscribe({
      next: (result) => {
        console.log('Toggle status result:', result);
        
        if (result.isSuccess) {
          // Reload users to get updated status
          this.loadUsers();
          
          const action = user.isDisabled ? 'enabled' : 'banned';
          alert(`User ${action} successfully!`);
        } else {
          alert(`Error: ${result.error?.description || 'Unknown error occurred'}`);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        alert('Error updating user status. Please check your connection and try again.');
        this.loading = false;
      }
    });
  }

  openRoleModal(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      alert('Invalid user data. Please refresh the page and try again.');
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
      const request: UserRoleRequest = {
        userId: this.selectedUser.id,
        roleIds: this.roleForm.value.roleIds
      };

      console.log('Updating roles:', request);
      this.loading = true;
      
      this.userService.assignRolesToUser(request).subscribe({
        next: (result) => {
          console.log('Assign roles result:', result);
          
          if (result.isSuccess) {
            this.loadUsers(); // Reload to get updated roles
            this.closeRoleModal();
            alert('Roles updated successfully!');
          } else {
            alert(`Error: ${result.error?.description || 'Unknown error occurred'}`);
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating roles:', error);
          alert('Error updating user roles. Please check your connection and try again.');
          this.loading = false;
        }
      });
    } else {
      console.log('Role form is invalid:', this.roleForm.errors);
      Object.keys(this.roleForm.controls).forEach(key => {
        this.roleForm.get(key)?.markAsTouched();
      });
    }
  }

  confirmDelete(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      alert('Invalid user data. Please refresh the page and try again.');
      return;
    }

    this.userToDelete = user;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (this.userToDelete) {
      // Since there's no delete endpoint, we'll ban the user instead
      this.toggleUserStatus(this.userToDelete);
      this.cancelDelete();
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
      
      // Search in username
      const usernameMatch = user.userName && 
        user.userName.toLowerCase().includes(searchTermLower);
      
      // Search in roles
      const rolesMatch = user.roles && Array.isArray(user.roles) &&
        user.roles.some(role => role && role.toLowerCase().includes(searchTermLower));
      
      return usernameMatch || rolesMatch;
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

  // Helper method to track items in ngFor for better performance
  trackByUserId(index: number, user: UserResponse): string {
    return user?.id || index.toString();
  }

  // Helper method to safely get user avatar letter
  getUserAvatarLetter(user: UserResponse): string {
    if (!user || !user.userName) return '?';
    return user.userName.charAt(0).toUpperCase();
  }

  // Method to refresh data
  refreshData(): void {
    console.log('Refreshing data...');
    this.loadUsers();
    this.loadRoles();
  }

  // Helper method to check if a role is assigned to the current user
  isRoleAssigned(roleId: string): boolean {
    if (!this.selectedUser || !this.selectedUser.roles) return false;
    
    const matchingRole = this.roles.find(role => role.id === roleId);
    if (!matchingRole) return false;
    
    return this.selectedUser.roles.includes(matchingRole.name);
  }
}