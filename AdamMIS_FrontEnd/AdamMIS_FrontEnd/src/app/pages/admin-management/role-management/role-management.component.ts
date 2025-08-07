import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RoleService, RolesResponse, RolesDetailsResponse, RoleRequest } from '../../../services/role.service';
import { NotificationService } from '../../../Notfications/notification.service';

@Component({
  selector: 'app-role-management',
  templateUrl: './role-management.component.html',
  styleUrls: ['./role-management.component.css']
})
export class RoleManagementComponent implements OnInit {
  // Data properties
  roles: RolesResponse[] = [];
  availablePermissions: string[] = [];
  selectedRole: RolesDetailsResponse | null = null;
  rolePermissionCounts: { [roleId: string]: number } = {};
  
  // Search functionality
  permissionSearchTerm: string = '';
  filteredPermissions: string[] = [];
  
  // UI state properties
  isLoading = false;
  isLoadingPermissions = false;
  includeDisabled = false;
  error: string | null = null;
  success: string | null = null;
  currentView: 'list' | 'add' | 'edit' = 'list';

  // Confirmation modal properties
  showConfirmModal = false;
  confirmModalTitle = '';
  confirmModalMessage = '';
  confirmModalAction: (() => void) | null = null;
  pendingToggleRole: RolesResponse | null = null;

  // Form properties
  roleForm: FormGroup;
  editRoleForm: FormGroup;

  constructor(
    private roleService: RoleService,
    private fb: FormBuilder,
    private notificationService: NotificationService // Add this injection
  ) {
    // Initialize forms
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      permissions: this.fb.array([], [Validators.required])
    });

    this.editRoleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      permissions: this.fb.array([], [Validators.required])
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadAvailablePermissions();
  }

  // Confirmation Modal Methods
  showConfirmationModal(title: string, message: string, action: () => void): void {
    this.confirmModalTitle = title;
    this.confirmModalMessage = message;
    this.confirmModalAction = action;
    this.showConfirmModal = true;
  }

  onModalConfirmed(): void {
    if (this.confirmModalAction) {
      this.confirmModalAction();
    }
    this.hideConfirmationModal();
  }

  onModalCancelled(): void {
    this.pendingToggleRole = null;
    this.hideConfirmationModal();
  }

  private hideConfirmationModal(): void {
    this.showConfirmModal = false;
    this.confirmModalTitle = '';
    this.confirmModalMessage = '';
    this.confirmModalAction = null;
  }

  // View Management
  setView(view: 'list' | 'add' | 'edit'): void {
    this.currentView = view;
    this.clearAlerts(); // Clear old alerts
    
    // Clear search when switching views
    this.clearPermissionSearch();
    
    if (view === 'add') {
      // Only reset form if permissions are loaded
      if (this.availablePermissions.length > 0) {
        this.resetAddForm();
      } else {
        // Wait for permissions to load, then reset form
        this.loadAvailablePermissions().then(() => {
          this.resetAddForm();
        });
      }
    } else if (view === 'list') {
      this.selectedRole = null;
    }
  }

  private clearAlerts(): void {
    this.error = null;
    this.success = null;
  }

  // Search functionality methods
  onPermissionSearch(searchTerm: string): void {
    this.permissionSearchTerm = searchTerm;
    this.updateFilteredPermissions();
  }

  clearPermissionSearch(): void {
    this.permissionSearchTerm = '';
    this.updateFilteredPermissions();
  }

  updateFilteredPermissions(): void {
    if (!this.permissionSearchTerm.trim()) {
      this.filteredPermissions = [...this.availablePermissions];
    } else {
      const searchTerm = this.permissionSearchTerm.toLowerCase().trim();
      this.filteredPermissions = this.availablePermissions.filter(permission =>
        permission.toLowerCase().includes(searchTerm)
      );
    }
  }

  getFilteredPermissions(): string[] {
    return this.filteredPermissions;
  }

  getOriginalPermissionIndex(permission: string): number {
    return this.availablePermissions.indexOf(permission);
  }

  highlightSearchTerm(permission: string): string {
    if (!this.permissionSearchTerm.trim()) {
      return permission;
    }
    
    const searchTerm = this.permissionSearchTerm.trim();
    const regex = new RegExp(`(${this.escapeRegExp(searchTerm)})`, 'gi');
    return permission.replace(regex, '<mark>$1</mark>');
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  trackByPermission(index: number, permission: string): string {
    return permission;
  }

  selectAllFilteredPermissions(): void {
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    
    this.filteredPermissions.forEach(permission => {
      const originalIndex = this.getOriginalPermissionIndex(permission);
      if (originalIndex !== -1) {
        // Ensure the form array has enough controls
        while (formArray.length <= originalIndex) {
          formArray.push(this.fb.control(false));
        }
        formArray.at(originalIndex).setValue(true);
      }
    });
  }

  deselectAllFilteredPermissions(): void {
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    
    this.filteredPermissions.forEach(permission => {
      const originalIndex = this.getOriginalPermissionIndex(permission);
      if (originalIndex !== -1 && formArray.at(originalIndex)) {
        formArray.at(originalIndex).setValue(false);
      }
    });
  }

  getSelectedPermissionCount(): number {
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    return formArray.controls.filter(control => control.value === true).length;
  }

  // Data loading methods
  loadRoles(): void {
    this.isLoading = true;
    this.clearAlerts();
    
    this.roleService.getAllRoles(this.includeDisabled).subscribe({
      next: (data) => {
        this.roles = data;
        this.isLoading = false;
        
        // Load permission counts for each role
        this.loadPermissionCounts();
      },
      error: (error) => {
        this.notificationService.showError('Failed to load roles. Please try again.');
        this.isLoading = false;
        console.error('Error loading roles:', error);
      }
    });
  }

  loadPermissionCounts(): void {
    // Load permission count for each role
    this.roles.forEach(role => {
      this.roleService.getRoleDetails(role.id).subscribe({
        next: (details) => {
          this.rolePermissionCounts[role.id] = details.permissions.length;
        },
        error: (error) => {
          console.error(`Error loading permissions for role ${role.id}:`, error);
          this.rolePermissionCounts[role.id] = 0;
        }
      });
    });
  }

  loadAvailablePermissions(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isLoadingPermissions = true;
      this.roleService.getAvailablePermissions().subscribe({
        next: (permissions) => {
          console.log('Loaded permissions:', permissions);
          this.availablePermissions = permissions;
          this.updateFilteredPermissions();
          this.isLoadingPermissions = false;
          resolve();
        },
        error: (error) => {
          this.notificationService.showError('Failed to load available permissions.');
          this.isLoadingPermissions = false;
          console.error('Error loading permissions:', error);
          reject(error);
        }
      });
    });
  }

  loadRoleDetails(roleId: string): void {
    this.roleService.getRoleDetails(roleId).subscribe({
      next: (data) => {
        this.selectedRole = data;
        this.populateEditForm(data);
      },
      error: (error) => {
        this.notificationService.showError('Failed to load role details.');
        console.error('Error loading role details:', error);
      }
    });
  }

  // Role Selection and Management
  selectRole(role: RolesResponse): void {
    if (this.selectedRole?.id === role.id) {
      this.selectedRole = null;
    } else {
      this.selectedRole = role as any;
    }
  }

  editRole(role: RolesResponse): void {
    this.loadRoleDetails(role.id);
    this.setView('edit');
  }

  // Form helper methods
  get permissionsFormArray(): FormArray {
    return this.roleForm.get('permissions') as FormArray;
  }

  get editPermissionsFormArray(): FormArray {
    return this.editRoleForm.get('permissions') as FormArray;
  }

  populateEditForm(role: RolesDetailsResponse): void {
    this.editRoleForm.patchValue({
      name: role.name
    });

    // Clear existing permissions
    while (this.editPermissionsFormArray.length !== 0) {
      this.editPermissionsFormArray.removeAt(0);
    }

    // Add selected permissions
    this.availablePermissions.forEach(permission => {
      const isSelected = role.permissions.includes(permission);
      this.editPermissionsFormArray.push(this.fb.control(isSelected));
    });
  }

  onPermissionChange(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const checked = target.checked;
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    
    // Ensure the form array has enough controls
    while (formArray.length <= index) {
      formArray.push(this.fb.control(false));
    }
    
    formArray.at(index).setValue(checked);
  }

  isPermissionSelected(index: number): boolean {
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    return formArray.at(index)?.value === true;
  }

  getSelectedPermissions(isEdit: boolean = false): string[] {
    const formArray = isEdit ? this.editPermissionsFormArray : this.permissionsFormArray;
    return this.availablePermissions.filter((permission, index) => 
      formArray.at(index)?.value === true
    );
  }

  // Form validation helpers
  isFieldInvalid(fieldName: string): boolean {
    const form = this.currentView === 'edit' ? this.editRoleForm : this.roleForm;
    const field = form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  hasNoPermissions(): boolean {
    const formArray = this.currentView === 'edit' ? this.editPermissionsFormArray : this.permissionsFormArray;
    return formArray.controls.every(control => !control.value);
  }

  isFormInvalid(): boolean {
    const form = this.currentView === 'edit' ? this.editRoleForm : this.roleForm;
    return form.invalid || this.hasNoPermissions();
  }

  resetAddForm(): void {
    console.log('Resetting form with permissions:', this.availablePermissions);
    this.roleForm.reset();
    
    // Reset permissions array
    while (this.permissionsFormArray.length !== 0) {
      this.permissionsFormArray.removeAt(0);
    }
    
    // Add all permissions as unchecked
    this.availablePermissions.forEach(() => {
      this.permissionsFormArray.push(this.fb.control(false));
    });
    
    // Update filtered permissions
    this.updateFilteredPermissions();
  }

  // CRUD operations
  onAddRole(): void {
    if (this.roleForm.valid) {
      const selectedPermissions = this.getSelectedPermissions();
      
      if (selectedPermissions.length === 0) {
        this.notificationService.showError('Please select at least one permission.');
        return;
      }

      const roleName = this.roleForm.value.name;

      // Show confirmation modal before creating
      this.showConfirmationModal(
        'Create New Role',
        `Are you sure you want to create the role "${roleName}" with ${selectedPermissions.length} permission(s)?`,
        () => this.executeAddRole()
      );
    }
  }

  private executeAddRole(): void {
    const selectedPermissions = this.getSelectedPermissions();
    const roleRequest: RoleRequest = {
      name: this.roleForm.value.name,
      permissions: selectedPermissions
    };

    this.isLoading = true;
    this.clearAlerts();
    
    this.roleService.addRole(roleRequest).subscribe({
      next: (result) => {
        console.log('Add role response:', result);
        
        // Handle different response formats
        if (result && (result.isSuccess === true || result === true)) {
          this.notificationService.showSuccess('Role created successfully!');
          this.loadRoles();
          this.setView('list');
        } else if (result && result.isSuccess === false) {
          this.notificationService.showError(result.error?.description || 'Failed to create role.');
        } else {
          // If the response doesn't have isSuccess but the role was created
          this.notificationService.showSuccess('Role created successfully!');
          this.loadRoles();
          this.setView('list');
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error creating role:', error);
        this.notificationService.showError('Failed to create role. Please try again.');
        this.isLoading = false;
        
        // Still reload roles in case the role was actually created
        this.loadRoles();
      }
    });
  }

  onEditRole(): void {
    if (this.editRoleForm.valid && this.selectedRole) {
      const selectedPermissions = this.getSelectedPermissions(true);
      
      if (selectedPermissions.length === 0) {
        this.notificationService.showError('Please select at least one permission.');
        return;
      }

      const roleName = this.editRoleForm.value.name;

      // Show confirmation modal before updating
      this.showConfirmationModal(
        'Update Role',
        `Are you sure you want to update the role "${roleName}" with ${selectedPermissions.length} permission(s)?`,
        () => this.executeEditRole()
      );
    }
  }

  private executeEditRole(): void {
    if (!this.selectedRole) return;

    const selectedPermissions = this.getSelectedPermissions(true);
    const roleRequest: RoleRequest = {
      name: this.editRoleForm.value.name,
      permissions: selectedPermissions
    };

    this.isLoading = true;
    this.clearAlerts();
    
    this.roleService.updateRole(this.selectedRole.id, roleRequest).subscribe({
      next: (success) => {
        if (success) {
          this.notificationService.showSuccess('Role updated successfully!');
          this.loadRoles();
          this.setView('list');
        } else {
          this.notificationService.showError('Failed to update role.');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.notificationService.showError('Failed to update role. Please try again.');
        this.isLoading = false;
        console.error('Error updating role:', error);
      }
    });
  }

  onToggleStatus(role: RolesResponse): void {
    this.pendingToggleRole = role;
    const action = role.isDeleted ? 'enable' : 'disable';
    const actionTitle = role.isDeleted ? 'Enable Role' : 'Disable Role';
    
    this.showConfirmationModal(
      actionTitle,
      `Are you sure you want to ${action} the role "${role.name}"? This action will ${action} all associated permissions for this role.`,
      () => this.executeToggleStatus()
    );
  }

  private executeToggleStatus(): void {
    if (!this.pendingToggleRole) return;

    const role = this.pendingToggleRole;
    const action = role.isDeleted ? 'enabled' : 'disabled';

    this.roleService.toggleRoleStatus(role.id).subscribe({
      next: (success) => {
        if (success) {
          this.notificationService.showSuccess(`Role "${role.name}" ${action} successfully!`);
          this.loadRoles();
        } else {
          this.notificationService.showError(`Failed to ${action.slice(0, -1)} role.`);
        }
        this.pendingToggleRole = null;
      },
      error: (error) => {
        this.notificationService.showError(`Failed to ${action.slice(0, -1)} role. Please try again.`);
        console.error('Error toggling role status:', error);
        this.pendingToggleRole = null;
      }
    });
  }

  onToggleIncludeDisabled(): void {
    this.includeDisabled = !this.includeDisabled;
    this.loadRoles();
    
    // Show info message about the filter change
    const message = this.includeDisabled 
      ? 'Now showing all roles including disabled ones'
      : 'Now showing only active roles';
    this.notificationService.showInfo(message);
  }

  // Utility methods
  getRoleStatusText(isDeleted: boolean): string {
    return isDeleted ? 'Disabled' : 'Active';
  }

  getRoleStatusClass(isDeleted: boolean): string {
    return isDeleted ? 'status-disabled' : 'status-active';
  }

  getPermissionCount(role: RolesResponse): number {
    // Check if we have the count cached
    if (this.rolePermissionCounts[role.id] !== undefined) {
      return this.rolePermissionCounts[role.id];
    }
    
    // If the role is the selected role and has details loaded, use the actual count
    if (this.selectedRole && this.selectedRole.id === role.id && this.selectedRole.permissions) {
      return this.selectedRole.permissions.length;
    }
    
    // Check if the role response includes permission count
    if ((role as any).permissionCount !== undefined) {
      return (role as any).permissionCount;
    }
    
    // Default to 0 while loading
    return 0;
  }
}