import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, UserResponse, CreateUserRequest, RolesResponse, UserRoleRequest } from '../../../services/user.service';

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
        alert('Failed to load users. Please check your connection and try again.');
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
        console.warn('Roles could not be loaded. Role management will be limited.');
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
      next: (userData: UserResponse) => {
        console.log('Add user result:', userData);
        this.loading = false;
        
        // Add the new user to our local data immediately
        const newUser: UserResponse = {
          id: userData.id,
          userName: userData.userName,
          isDisabled: userData.isDisabled || false,
          roles: userData.roles || request.roles || []
        };
        
        this.allUsersData.push(newUser);
        this.updateUserLists();
        
        this.closeAddUserModal();
        alert('User added successfully!');
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
        
        alert(errorMessage);
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
    
    // Show loading state for the specific action
    const previousState = user.isDisabled;
    
    this.userService.toggleUserStatus(user.id).subscribe({
      next: () => {
        console.log('User status toggled successfully');
        
        // Update the user status immediately in our local data
        const userIndex = this.allUsersData.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          this.allUsersData[userIndex].isDisabled = !previousState;
          this.updateUserLists();
        }
        
        const action = previousState ? 'enabled' : 'banned';
        alert(`User ${action} successfully!`);
      },
      error: (error) => {
        console.error('Error toggling user status:', error);
        alert('Error updating user status. Please check your connection and try again.');
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
          alert('Roles updated successfully!');
        },
        error: (error) => {
          console.error('Error updating user roles:', error);
          this.loading = false;
          alert('Error updating user roles. Please check your connection and try again.');
        }
      });
    } else {
      console.log('Role form is invalid:', this.roleForm.errors);
      Object.keys(this.roleForm.controls).forEach(key => {
        this.roleForm.get(key)?.markAsTouched();
      });
    }
  }

  // Fixed: Remove duplicate delete functionality, only keep ban/unban
  confirmBanUser(user: UserResponse): void {
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
      this.toggleUserStatus(this.userToDelete);
      this.cancelDelete();
    }
  }

  // New method for user profile navigation
  viewUserProfile(user: UserResponse): void {
    if (!user || !user.id) {
      console.error('Invalid user data:', user);
      alert('Invalid user data. Please refresh the page and try again.');
      return;
    }

    // TODO: Navigate to user profile component
    console.log('Navigate to user profile:', user);
    alert(`User profile feature will be implemented soon for user: ${user.userName}`);
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

  trackByUserId(index: number, user: UserResponse): string {
    return user?.id || index.toString();
  }

  getUserAvatarLetter(user: UserResponse): string {
    if (!user || !user.userName) return '?';
    return user.userName.charAt(0).toUpperCase();
  }

  refreshData(): void {
    console.log('Refreshing data...');
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