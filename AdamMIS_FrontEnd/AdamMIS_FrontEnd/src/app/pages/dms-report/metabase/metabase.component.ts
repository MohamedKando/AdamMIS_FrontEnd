import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { 
  MetabaseService, 
  MetabaseResponse, 
  MetabaseRequest, 
  UserMetabaseResponse, 
  User,
  UserMetabaseRequest 
} from '../../../services/metabase.service';

interface TabData {
  id: string;
  label: string;
  active: boolean;
}

@Component({
  selector: 'app-metabase',
  templateUrl: './metabase.component.html',
  styleUrls: ['./metabase.component.css']
})
export class MetabaseComponent implements OnInit {
  // Tab management
  tabs: TabData[] = [
    { id: 'urls', label: 'URL Management', active: true },
    { id: 'assignments', label: 'User Assignments', active: false },
    { id: 'history', label: 'Assignment History', active: false }
  ];
  activeTab = 'urls';

  // Forms
  urlForm: FormGroup;
  assignmentForm: FormGroup;

  // Data
  urls: MetabaseResponse[] = [];
  filteredUrls: MetabaseResponse[] = [];
  users: User[] = [];
  filteredUsers: User[] = [];
  assignments: UserMetabaseResponse[] = [];
  filteredAssignments: UserMetabaseResponse[] = [];

  // UI State
  loading = false;
  error: string | null = null;
  success: string | null = null;
  editingUrl: MetabaseResponse | null = null;
  selectedUsers: string[] = [];
  selectedUrls: number[] = [];
  
  // Search terms
  searchTerm = ''; // For assignment history search
  urlSearchTerm = ''; // For URL search
  userSearchTerm = ''; // For user search

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  constructor(
    private metabaseService: MetabaseService,
    private fb: FormBuilder
  ) {
    this.urlForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      description: ['', Validators.required]
    });

    this.assignmentForm = this.fb.group({
      selectedUrls: [[], Validators.required],
      selectedUsers: [[], Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  // Tab Management
  switchTab(tabId: string): void {
    this.tabs.forEach(tab => tab.active = tab.id === tabId);
    this.activeTab = tabId;
    this.clearMessages();
    
    if (tabId === 'history') {
      this.loadAssignmentHistory();
    }
  }

  // Data Loading
  loadInitialData(): void {
    this.loading = true;
    Promise.all([
      this.loadUrls(),
      this.loadUsers(),
      this.loadAssignments()
    ]).finally(() => {
      this.loading = false;
    });
  }

  loadUrls(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.metabaseService.getAllUrls().subscribe({
        next: (urls) => {
          this.urls = urls;
          this.filteredUrls = [...urls];
          resolve();
        },
        error: (error) => {
          this.showError('Failed to load URLs: ' + error.message);
          reject(error);
        }
      });
    });
  }

  loadUsers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.metabaseService.getAllUsers().subscribe({
        next: (users) => {
          this.users = users;
          this.filteredUsers = [...users];
          resolve();
        },
        error: (error) => {
          this.showError('Failed to load users: ' + error.message);
          reject(error);
        }
      });
    });
  }

  loadAssignments(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.metabaseService.getAllAssignments().subscribe({
        next: (assignments) => {
          this.assignments = assignments;
          this.filteredAssignments = [...assignments];
          this.totalItems = assignments.length;
          resolve();
        },
        error: (error) => {
          this.showError('Failed to load assignments: ' + error.message);
          reject(error);
        }
      });
    });
  }

  loadAssignmentHistory(): void {
    this.loadAssignments();
  }

  // Search Functions
  onUrlSearch(): void {
    if (!this.urlSearchTerm.trim()) {
      this.filteredUrls = [...this.urls];
    } else {
      const term = this.urlSearchTerm.toLowerCase();
      this.filteredUrls = this.urls.filter(url =>
        url.title.toLowerCase().includes(term) ||
        url.description.toLowerCase().includes(term) ||
        url.url.toLowerCase().includes(term)
      );
    }
  }

  onUserSearch(): void {
    if (!this.userSearchTerm.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const term = this.userSearchTerm.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.userName.toLowerCase().includes(term) ||
        (user.email && user.email.toLowerCase().includes(term)) ||
        (user.department?.name && user.department.name.toLowerCase().includes(term))
      );
    }
  }

  onAssignmentSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredAssignments = [...this.assignments];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAssignments = this.assignments.filter(assignment =>
        assignment.userName.toLowerCase().includes(term) ||
        assignment.metabaseTitle.toLowerCase().includes(term) ||
        assignment.metabaseUrl.toLowerCase().includes(term)
      );
    }
    this.totalItems = this.filteredAssignments.length;
    this.currentPage = 1;
  }

  clearUrlSearch(): void {
    this.urlSearchTerm = '';
    this.onUrlSearch();
  }

  clearUserSearch(): void {
    this.userSearchTerm = '';
    this.onUserSearch();
  }

  clearAssignmentSearch(): void {
    this.searchTerm = '';
    this.onAssignmentSearch();
  }

  // URL Management
  onUrlSubmit(): void {
    if (this.urlForm.valid) {
      const formValue = this.urlForm.value;
      const request: MetabaseRequest = {
        title: formValue.title,
        url: formValue.url,
        description: formValue.description
      };

      this.loading = true;

      if (this.editingUrl) {
        // Update existing URL
        this.metabaseService.updateUrl(this.editingUrl.id, request).subscribe({
          next: (updatedUrl) => {
            const index = this.urls.findIndex(u => u.id === this.editingUrl!.id);
            if (index !== -1) {
              this.urls[index] = updatedUrl;
              this.onUrlSearch(); // Refresh filtered list
            }
            this.showSuccess('URL updated successfully');
            this.resetUrlForm();
            this.loading = false;
          },
          error: (error) => {
            this.showError('Failed to update URL: ' + error.message);
            this.loading = false;
          }
        });
      } else {
        // Create new URL
        this.metabaseService.createUrl(request).subscribe({
          next: (newUrl) => {
            this.urls.push(newUrl);
            this.onUrlSearch(); // Refresh filtered list
            this.showSuccess('URL created successfully');
            this.resetUrlForm();
            this.loading = false;
          },
          error: (error) => {
            this.showError('Failed to create URL: ' + error.message);
            this.loading = false;
          }
        });
      }
    }
  }

  editUrl(url: MetabaseResponse): void {
    this.editingUrl = url;
    this.urlForm.patchValue({
      title: url.title,
      url: url.url,
      description: url.description // Now properly loaded
    });
  }

  deleteUrl(url: MetabaseResponse): void {
    if (confirm(`Are you sure you want to delete "${url.title}"?`)) {
      this.loading = true;
      this.metabaseService.deleteUrl(url.id).subscribe({
        next: () => {
          this.urls = this.urls.filter(u => u.id !== url.id);
          this.onUrlSearch(); // Refresh filtered list
          this.showSuccess('URL deleted successfully');
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to delete URL: ' + error.message);
          this.loading = false;
        }
      });
    }
  }

  resetUrlForm(): void {
    this.urlForm.reset();
    this.editingUrl = null;
  }

  // Assignment Management
  onAssignmentSubmit(): void {
    if (this.selectedUrls.length > 0 && this.selectedUsers.length > 0) {
      const request: UserMetabaseRequest = {
        metabaseIds: this.selectedUrls,
        userIds: this.selectedUsers
      };

      this.loading = true;
      this.metabaseService.assignUrlsToUsers(request).subscribe({
        next: (newAssignments) => {
          this.assignments.push(...newAssignments);
          this.filteredAssignments = [...this.assignments];
          this.totalItems = this.assignments.length;
          this.showSuccess(`Successfully assigned ${this.selectedUrls.length} URL(s) to ${this.selectedUsers.length} user(s)`);
          this.resetAssignmentForm();
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to create assignments: ' + error.message);
          this.loading = false;
        }
      });
    }
  }

  removeAssignment(assignment: UserMetabaseResponse): void {
    if (confirm(`Remove assignment of "${assignment.metabaseTitle}" from ${assignment.userName}?`)) {
      this.loading = true;
      this.metabaseService.unassignUrlFromUser(assignment.id).subscribe({
        next: () => {
          this.assignments = this.assignments.filter(a => a.id !== assignment.id);
          this.filteredAssignments = this.filteredAssignments.filter(a => a.id !== assignment.id);
          this.totalItems = this.assignments.length;
          this.showSuccess('Assignment removed successfully');
          this.loading = false;
        },
        error: (error) => {
          this.showError('Failed to remove assignment: ' + error.message);
          this.loading = false;
        }
      });
    }
  }

  resetAssignmentForm(): void {
    this.selectedUsers = [];
    this.selectedUrls = [];
  }

  // Selection Management
  toggleUrlSelection(urlId: number): void {
    const index = this.selectedUrls.indexOf(urlId);
    if (index > -1) {
      this.selectedUrls.splice(index, 1);
    } else {
      this.selectedUrls.push(urlId);
    }
  }

  toggleUserSelection(userId: string): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index > -1) {
      this.selectedUsers.splice(index, 1);
    } else {
      this.selectedUsers.push(userId);
    }
  }

  isUrlSelected(urlId: number): boolean {
    return this.selectedUrls.includes(urlId);
  }

  isUserSelected(userId: string): boolean {
    return this.selectedUsers.includes(userId);
  }

  // Pagination
  get paginatedAssignments(): UserMetabaseResponse[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredAssignments.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Utility Methods
  getUserName(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.userName : userId;
  }

  getUrlTitle(urlId: number): string {
    const url = this.urls.find(u => u.id === urlId);
    return url ? url.title : 'Unknown URL';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  }

  // Helper method for Math.min in template
  getEndIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  // Message Management
  showError(message: string): void {
    this.error = message;
    this.success = null;
    setTimeout(() => this.clearMessages(), 5000);
  }

  showSuccess(message: string): void {
    this.success = message;
    this.error = null;
    setTimeout(() => this.clearMessages(), 3000);
  }

  clearMessages(): void {
    this.error = null;
    this.success = null;
  }

  // Form Validation Helpers
  isUrlFormFieldInvalid(fieldName: string): boolean {
    const field = this.urlForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getUrlFormFieldError(fieldName: string): string {
    const field = this.urlForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['minlength']) return `${fieldName} must be at least ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return `${fieldName} must be a valid URL (starting with http:// or https://)`;
    }
    return '';
  }
}