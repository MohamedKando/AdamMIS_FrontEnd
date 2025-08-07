import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportService, RCategoryResponse, ReportResponse, UserReportResponse, User, UploadProgress } from '../../../services/report.service';
import { NotificationService } from '../../../Notfications/notification.service';
import { UserService, UserResponse ,DepartmentResponse } from '../../../services/user.service';

// Interfaces for type safety
interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  reportCount?: number;
}

interface Report {
  id: number;
  fileName: string;
  filePath: string;
  categoryId: number;
  categoryName: string;
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

interface UserWithReports {
  id: string;
  userName: string;
  reportCount: number;
}

interface UserReportAssignment {
  id: number;
  userId: string;
  userName: string;
  reportId: number;
  reportFileName: string;
  categoryName: string;
  assignedAt: Date;
  assignedBy: string;
  isActive: boolean;
}




@Component({
  selector: 'app-report-management',
  templateUrl: './report-management.component.html',
  styleUrls: ['./report-management.component.css']
})
export class ReportManagementComponent implements OnInit {
  // Tab management
  activeTab: string = 'categories';
  private readonly DISPLAY_LIMIT = 10;
  activeUserReportsSubTab: string = 'assign';
  
  // Confirmation modal properties
  showDeleteConfirmation: boolean = false;
  showDeleteReportConfirmation: boolean = false;
  showRemoveAssignmentConfirmation: boolean = false;
  
  categoryToDelete: number | null = null;
  reportToDelete: number | null = null;
  assignmentToRemove: number | null = null;
  
  // Assignment filtering
  assignmentCategoryFilter: string = '';
  assignmentDateFilter: string = '';
  
  // Assignment mode and category selection
  assignmentMode: 'individual' | 'category' = 'individual';
  selectedCategoryForAssignment: number | null = null;

  //Deparments
  departments: DepartmentResponse[] = [];
  selectedDepartmentId: number | null = null;
  departmentUsers: UserResponse[] = [];
  isLoadingDepartmentUsers: boolean = false;

  categorySearchTerm: string = '';
  filteredCategories: Category[] = [];
  // Category management
  categories: Category[] = [];
  newCategory: Category = {
    id: 0,
    name: '',
    description: '',
    color: '#3498db'
  };
  isEditModalOpen = false;
  editingCategory: any = {
  id: null,
  name: '',
  description: '',
  color: '#000000'
};
  isAddingCategory: boolean = false;
  isUpdatingCategory: boolean = false;

  // Report management
  reports: Report[] = [];
  filteredReports: Report[] = [];
  selectedFile: File | null = null;
  fileName: string = '';
  selectedCategoryId: number | null = null;
  selectedFilterCategory: string = '';
  searchTerm: string = '';
  isGenerating: boolean = false;
  progress: number = 0;
  uploadMessage: string = '';

  // User management
  users: User[] = [];
  usersWithReports: UserWithReports[] = [];
  userReportAssignments: UserReportAssignment[] = [];
  selectedUserIds: string[] = [];
  selectedReportIds: number[] = [];
  isAssigning: boolean = false;
  
  // Search functionality for user/report assignment
  userSearchTerm: string = '';
  reportSearchTerm: string = '';
  filteredUsers: User[] = [];
  filteredReportsForAssignment: Report[] = [];
  
  // Search functionality for different sections
  userOverviewSearchTerm: string = '';
  filteredUsersWithReports: UserWithReports[] = [];
  assignmentSearchTerm: string = '';
  filteredUserReportAssignments: UserReportAssignment[] = [];

  // Loading states
  isLoadingCategories: boolean = false;
  isLoadingReports: boolean = false;
  isLoadingUsers: boolean = false;
  isLoadingAssignments: boolean = false;

  constructor(
    private router: Router,
    private reportService: ReportService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {
    this.activeTab = 'user-reports';
  }

  ngOnInit(): void {
    this.loadInitialData();
    
  }

  // Display methods
  getDisplayedUsers(): User[] {
    return this.filteredUsers.slice(0, this.DISPLAY_LIMIT);
  }

  getDisplayedReportsForAssignment(): Report[] {
    return this.filteredReportsForAssignment.slice(0, this.DISPLAY_LIMIT);
  }

  getDisplayedUsersWithReports(): UserWithReports[] {
    return this.filteredUsersWithReports.slice(0, this.DISPLAY_LIMIT);
  }

  getDisplayedAssignments(): UserReportAssignment[] {
    return this.filteredUserReportAssignments.slice(0, this.DISPLAY_LIMIT);
  }

  // Assignment mode methods
  onAssignmentModeChange(): void {
    console.log('Assignment mode changed to:', this.assignmentMode);
    this.resetAssignmentForm();
    
    if (this.assignmentMode === 'category') {
      this.filteredReportsForAssignment = [];
      if (this.selectedCategoryForAssignment) {
        this.loadReportsForSelectedCategory();
      }
    } else {
      this.filteredReportsForAssignment = [...this.reports];
    }
  }

  onCategorySelectionChange(): void {
    console.log('Category selection changed:', this.selectedCategoryForAssignment);
    
    if (this.selectedCategoryForAssignment) {
      this.selectedCategoryForAssignment = Number(this.selectedCategoryForAssignment);
      this.selectedReportIds = [];
      this.loadReportsForSelectedCategory();
    } else {
      this.filteredReportsForAssignment = [];
    }
    
    this.debugCategorySelection();
  }

  private loadReportsForSelectedCategory(): void {
    console.log('Loading reports for category:', this.selectedCategoryForAssignment);
    console.log('All reports:', this.reports);
    
    if (this.selectedCategoryForAssignment) {
      const categoryId = Number(this.selectedCategoryForAssignment);
      
      const categoryReports = this.reports.filter(report => {
        console.log(`Comparing report categoryId: ${report.categoryId} with selected: ${categoryId}`);
        return report.categoryId === categoryId;
      });
      
      console.log('Found category reports:', categoryReports);
      this.filteredReportsForAssignment = categoryReports;
      this.reportSearchTerm = '';
    } else {
      this.filteredReportsForAssignment = [...this.reports];
    }
  }

  getReportCountForCategory(categoryId: number): number {
    return this.reports.filter(report => report.categoryId === categoryId).length;
  }

  getReportsForCategory(categoryId: number): Report[] {
    return this.reports.filter(report => report.categoryId === categoryId);
  }

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  }

  canAssignReports(): boolean {
    const hasUsers = this.selectedUserIds.length > 0;
    
    if (this.assignmentMode === 'individual') {
      return hasUsers && this.selectedReportIds.length > 0;
    } else if (this.assignmentMode === 'category') {
      return hasUsers && this.selectedCategoryForAssignment !== null;
    }
    
    return false;
  }

  // Tab management
  setActiveUserReportsSubTab(subTab: string): void {
    this.activeUserReportsSubTab = subTab;
    
    switch (subTab) {
      case 'assign':
        this.loadUsersAndReportsForAssignment();
        break;
      case 'overview':
        this.loadUsersWithReportsOverview();
        break;
      case 'history':
        this.loadAssignmentHistory();
        break;
    }
  }
  
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    switch (tab) {
      case 'categories':
        this.loadCategories();
        break;
      case 'reports':
        this.loadReports();
        break;
      case 'user-reports':
        this.loadUsers();
        this.loadUserReportAssignments();
        this.setActiveUserReportsSubTab('assign');
        break;
    }
  }

  // Loading methods
  private async loadUsersAndReportsForAssignment(): Promise<void> {
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadReports()
      ]);
      this.filterUsersForAssignment();
      this.filterReportsForAssignment();
    } catch (error) {
      console.error('Error loading users and reports for assignment:', error);
    }
  }

  private async loadUsersWithReportsOverview(): Promise<void> {
    try {
      await Promise.all([
        this.loadUsers(),
        this.loadUserReportAssignments()
      ]);
      this.filterUsersWithReports();
    } catch (error) {
      console.error('Error loading users with reports overview:', error);
    }
  }

  private async loadAssignmentHistory(): Promise<void> {
    try {
      await Promise.all([
        this.loadUserReportAssignments(),
        this.loadCategories()
      ]);
      this.filterUserReportAssignments();
    } catch (error) {
      console.error('Error loading assignment history:', error);
    }
  }

  private async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadCategories(),
        this.loadReports(),
        this.loadUsers(),
        this.loadUserReportAssignments(),
        this.loadDepartments()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.notificationService.showError('Error loading initial data. Please refresh the page.');
    }
  }

  // Category Management Methods - Updated with notifications
private async loadCategories(): Promise<void> {
  if (this.isLoadingCategories) return;
  
  this.isLoadingCategories = true;
  try {
    const response = await this.reportService.getAllCategories().toPromise();
    this.categories = response || [];
    this.filteredCategories = [...this.categories]; // Initialize filtered categories
  } catch (error) {
    console.error('Error loading categories:', error);
    this.notificationService.showError('Error loading categories. Please try again.');
    this.categories = [];
    this.filteredCategories = [];
  } finally {
    this.isLoadingCategories = false;
  }
}
filterCategories(): void {
  this.filteredCategories = this.categories.filter(category => {
    const matchesSearch = !this.categorySearchTerm || 
      category.name.toLowerCase().includes(this.categorySearchTerm.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(this.categorySearchTerm.toLowerCase()));
    
    return matchesSearch;
  });
}
    async addCategory(): Promise<void> {
    if (!this.newCategory.name.trim()) {
      this.notificationService.showError('Please enter a category name');
      return;
    }

    this.isAddingCategory = true;
    try {
      const categoryRequest = {
        name: this.newCategory.name,
        description: this.newCategory.description,
        color: this.newCategory.color
      };
      
      const response = await this.reportService.createCategory(categoryRequest).toPromise();
      if (response) {
        await this.loadCategories();
        this.resetCategoryForm();
        this.notificationService.showSuccess('Category added successfully!');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      this.notificationService.showError('Error adding category. Please try again.');
    } finally {
      this.isAddingCategory = false;
    }
  }
  openEditModal(category: any): void {
    this.editingCategory = {
      id: category.id,
      name: category.name,
      description: category.description || '',
      color: category.color || '#000000'
    };
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingCategory = {
      id: null,
      name: '',
      description: '',
      color: '#000000'
    };
  }


  async updateCategory(): Promise<void> {
  if (!this.editingCategory.id) return;
  
  this.isUpdatingCategory = true;
  try {
    const updateRequest = {
      name: this.editingCategory.name,
      description: this.editingCategory.description,
      color: this.editingCategory.color
    };
    
    const response = await this.reportService.updateCategory(this.editingCategory.id, updateRequest).toPromise();
    if (response) {
      await this.loadCategories();
      this.filterCategories(); // Re-apply current filter
      this.notificationService.showSuccess('Category updated successfully!');
      this.closeEditModal();
    }
  } catch (error) {
    console.error('Error updating category:', error);
    this.notificationService.showError('Error updating category. Please try again.');
  } finally {
    this.isUpdatingCategory = false;
  }
}

  // Updated delete methods with modals
  initiateDeleteCategory(categoryId: number): void {
    this.categoryToDelete = categoryId;
    this.showDeleteConfirmation = true;
  }

async confirmDeleteCategory(): Promise<void> {
  if (this.categoryToDelete === null) return;

  try {
    await this.reportService.deleteCategory(this.categoryToDelete).toPromise();
    this.categories = this.categories.filter(cat => cat.id !== this.categoryToDelete);
    this.filterCategories(); // Re-apply current filter
    this.notificationService.showSuccess('Category deleted successfully!');
  } catch (error: any) {
    console.error('Error deleting category:', error);
    
    // Check if the error is due to foreign key constraint/restriction
    if (error?.status === 400 || error?.status === 409 || 
        error?.message?.includes('constraint') || 
        error?.message?.includes('restrict') ||
        error?.message?.includes('foreign key') ||
        error?.error?.message?.includes('reports')) {
      this.notificationService.showError('Please delete the reports of this category first');
    } else {
      this.notificationService.showError('Error deleting category. Please try again.');
    }
  } finally {
    this.categoryToDelete = null;
    this.showDeleteConfirmation = false;
  }
}
  cancelDeleteCategory(): void {
    this.categoryToDelete = null;
    this.showDeleteConfirmation = false;
  }

  private resetCategoryForm(): void {
    this.newCategory = {
      id: 0,
      name: '',
      description: '',
      color: '#3498db'
    };
  }

  // Report Management Methods - Updated with notifications
  private async loadReports(): Promise<void> {
    if (this.isLoadingReports) return;
    
    this.isLoadingReports = true;
    try {
      const response = await this.reportService.getAllReports().toPromise();
      this.reports = response || [];
      this.filteredReports = [...this.reports];
      this.filteredReportsForAssignment = [...this.reports];
    } catch (error) {
      console.error('Error loading reports:', error);
      this.notificationService.showError('Error loading reports. Please try again.');
      this.reports = [];
      this.filteredReports = [];
      this.filteredReportsForAssignment = [];
    } finally {
      this.isLoadingReports = false;
    }
  }

  // File Upload Methods
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const uploadArea = event.currentTarget as HTMLElement;
    uploadArea.classList.remove('drag-over');
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleFileSelection(target.files[0]);
    }
  }

  private handleFileSelection(file: File): void {
    if (!file.name.toLowerCase().endsWith('.rpt')) {
      this.notificationService.showError('Please select a valid .rpt file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.notificationService.showError('File size must be less than 10MB');
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
  }

  async uploadReport(): Promise<void> {
    if (!this.selectedFile || !this.selectedCategoryId) {
      this.notificationService.showError('Please select a file and category');
      return;
    }

    this.isGenerating = true;
    this.progress = 0;
    this.uploadMessage = '';

    try {
      this.reportService.uploadReport(this.selectedFile, this.selectedCategoryId).subscribe({
        next: (progressData: UploadProgress) => {
          this.progress = progressData.progress;
          this.uploadMessage = progressData.message || '';
          
          if (progressData.status === 'completed') {
            this.loadReports();
            this.resetUploadForm();
            this.notificationService.showSuccess('Report uploaded successfully!');
          }
        },
        error: (error: any) => {
          console.error('Error uploading report:', error);
          this.notificationService.showError('Error uploading report. Please try again.');
          this.resetUploadForm();
        },
        complete: () => {
          setTimeout(() => {
            this.isGenerating = false;
            this.progress = 0;
            this.uploadMessage = '';
          }, 1000);
        }
      });
    } catch (error) {
      console.error('Error uploading report:', error);
      this.notificationService.showError('Error uploading report. Please try again.');
      this.isGenerating = false;
      this.progress = 0;
      this.uploadMessage = '';
    }
  }

  private resetUploadForm(): void {
    this.selectedFile = null;
    this.fileName = '';
    this.selectedCategoryId = null;
  }

  // Report methods with modals
  viewReport(report: Report): void {
    this.reportService.editReport(report.id).subscribe(
      response => {
        console.log('Report editor opened:', response.message);
        this.notificationService.showInfo('Report editor has been opened. Make your changes and save the file.');
      },
      error => {
        console.error('Error opening report editor:', error);
        this.notificationService.showError('Could not open report editor. Please try again.');
      }
    );
  }

  initiateDeleteReport(reportId: number): void {
    this.reportToDelete = reportId;
    this.showDeleteReportConfirmation = true;
  }

  async confirmDeleteReport(): Promise<void> {
    if (this.reportToDelete === null) return;

    try {
      await this.reportService.deleteReport(this.reportToDelete).toPromise();
      await this.loadReports();
      this.notificationService.showSuccess('Report deleted successfully!');
    } catch (error) {
      console.error('Error deleting report:', error);
      this.notificationService.showError('Error deleting report. Please try again.');
    } finally {
      this.reportToDelete = null;
      this.showDeleteReportConfirmation = false;
    }
  }

  cancelDeleteReport(): void {
    this.reportToDelete = null;
    this.showDeleteReportConfirmation = false;
  }

  // Report Filtering
filterReports(): void {
  this.filteredReports = this.reports.filter(report => {
    const matchesCategory = !this.selectedFilterCategory || 
      report.categoryId.toString() === this.selectedFilterCategory;
    
    // Enhanced search to include category description
    const matchesSearch = !this.searchTerm || 
      report.fileName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      report.categoryName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      this.getCategoryDescription(report.categoryId).toLowerCase().includes(this.searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });
}

  // User Search for Assignment
  filterUsersForAssignment(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.userSearchTerm || 
        user.userName.toLowerCase().includes(this.userSearchTerm.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(this.userSearchTerm.toLowerCase()));
      
      return matchesSearch;
    });
  }

  // Report Search for Assignment
filterReportsForAssignment(): void {
  let reportsToFilter = this.reports;
  
  if (this.assignmentMode === 'category' && this.selectedCategoryForAssignment) {
    const categoryId = Number(this.selectedCategoryForAssignment);
    reportsToFilter = this.reports.filter(report => 
      report.categoryId === categoryId
    );
  }
  
  this.filteredReportsForAssignment = reportsToFilter.filter(report => {
    // Enhanced search to include category description
    const matchesSearch = !this.reportSearchTerm || 
      report.fileName.toLowerCase().includes(this.reportSearchTerm.toLowerCase()) ||
      report.categoryName.toLowerCase().includes(this.reportSearchTerm.toLowerCase()) ||
      this.getCategoryDescription(report.categoryId).toLowerCase().includes(this.reportSearchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  console.log('Filtered reports for assignment:', this.filteredReportsForAssignment);
}
getCategoryDescription(categoryId: number): string {
  const category = this.categories.find(cat => cat.id === categoryId);
  return category ? category.description : '';
}
  filterUsersWithReports(): void {
    this.filteredUsersWithReports = this.usersWithReports.filter(user => {
      const matchesSearch = !this.userOverviewSearchTerm || 
        user.userName.toLowerCase().includes(this.userOverviewSearchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }
// Your existing viewUserReports method stays the same
viewUserReports(userId: string): void {
  this.setActiveUserReportsSubTab('history');
  
  const user = this.users.find(u => u.id === userId);
  if (user) {
    this.assignmentSearchTerm = user.userName; // This now works with exact match
    this.filterUserReportAssignments();
  }
}
// Minimal change to your existing code - just change the filter logic

filterUserReportAssignments(): void {
  this.filteredUserReportAssignments = this.userReportAssignments.filter(assignment => {
    // FIXED: Use exact match (===) instead of includes() when searching by exact User Name 
    const matchesSearch = !this.assignmentSearchTerm || 
      assignment.userName.toLowerCase() === this.assignmentSearchTerm.toLowerCase() || // EXACT match for user names
      assignment.reportFileName.toLowerCase().includes(this.assignmentSearchTerm.toLowerCase()) ||
      assignment.categoryName.toLowerCase().includes(this.assignmentSearchTerm.toLowerCase());
    
    const matchesCategory = !this.assignmentCategoryFilter || 
      assignment.categoryName === this.assignmentCategoryFilter;
    
    const matchesDate = this.matchesDateFilter(assignment.assignedAt);
    
    return matchesSearch && matchesCategory && matchesDate;
  });
}

  private matchesDateFilter(assignedDate: Date): boolean {
    if (!this.assignmentDateFilter) return true;
    
    const now = new Date();
    const assignmentDate = new Date(assignedDate);
    
    switch (this.assignmentDateFilter) {
      case 'today':
        return assignmentDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return assignmentDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return assignmentDate >= monthAgo;
      default:
        return true;
    }
  }

  getTotalAssignments(): number {
    return this.userReportAssignments.filter(assignment => assignment.isActive).length;
  }

  viewAssignmentDetails(assignment: UserReportAssignment): void {
    console.log('View assignment details:', assignment);
    this.notificationService.showInfo(`Assignment Details: User: ${assignment.userName}, Report: ${assignment.reportFileName}, Category: ${assignment.categoryName}`);
  }

  // User Management Methods - Updated with notifications
  private async loadUsers(): Promise<void> {
    if (this.isLoadingUsers) return;
    
    this.isLoadingUsers = true;
    try {
      const response = await this.reportService.getAllUsers().toPromise();
      this.users = response || [];
      this.filteredUsers = [...this.users];
      this.updateUsersWithReports();
    } catch (error) {
      console.error('Error loading users:', error);
      this.notificationService.showError('Error loading users. Please try again.');
      this.users = [];
      this.filteredUsers = [];
    } finally {
      this.isLoadingUsers = false;
    }
  }

  private updateUsersWithReports(): void {
    this.usersWithReports = this.users.map(user => ({
      id: user.id,
      userName: user.userName,
      reportCount: this.userReportAssignments.filter(assignment => assignment.userId === user.id && assignment.isActive).length
    }));
    
    this.filteredUsersWithReports = [...this.usersWithReports];
  }

private async loadUserReportAssignments(): Promise<void> {
  if (this.isLoadingAssignments) return;
  
  this.isLoadingAssignments = true;
  try {
    // BEFORE: Multiple API calls (N+1 problem)
    // for (const user of this.users) {
    //   const userReports = await this.reportService.getUserReports(user.id).toPromise();
    //   if (userReports) {
    //     allAssignments.push(...userReports);
    //   }
    // }

    // AFTER: Single API call
    const allAssignments = await this.reportService.getAllUserReports().toPromise();
    
    this.userReportAssignments = allAssignments || [];
    this.filteredUserReportAssignments = [...this.userReportAssignments];
    this.updateUsersWithReports();
    
  } catch (error) {
    console.error('Error loading user report assignments:', error);
    this.notificationService.showError('Error loading user report assignments. Please try again.');
    this.userReportAssignments = [];
    this.filteredUserReportAssignments = [];
  } finally {
    this.isLoadingAssignments = false;
  }
}
  // User Report Assignment Methods
  onUserSelection(event: Event, userId: string): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedUserIds.push(userId);
    } else {
      this.selectedUserIds = this.selectedUserIds.filter(id => id !== userId);
    }
  }

  onReportSelection(event: Event, reportId: number): void {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      this.selectedReportIds.push(reportId);
    } else {
      this.selectedReportIds = this.selectedReportIds.filter(id => id !== reportId);
    }
  }

  async assignReports(): Promise<void> {
    console.log('assignReports called with:', {
      canAssign: this.canAssignReports(),
      assignmentMode: this.assignmentMode,
      selectedUserIds: this.selectedUserIds,
      selectedCategoryForAssignment: this.selectedCategoryForAssignment,
      selectedReportIds: this.selectedReportIds,
      filteredReportsForAssignment: this.filteredReportsForAssignment
    });

    if (!this.canAssignReports()) {
      let errorMessage = 'Please select ';
      if (this.selectedUserIds.length === 0) {
        errorMessage += 'users';
      }
      if (this.assignmentMode === 'individual' && this.selectedReportIds.length === 0) {
        errorMessage += (this.selectedUserIds.length === 0 ? ' and ' : '') + 'reports';
      }
      if (this.assignmentMode === 'category' && !this.selectedCategoryForAssignment) {
        errorMessage += (this.selectedUserIds.length === 0 ? ' and ' : '') + 'a category';
      }
      if (this.assignmentMode === 'category' && this.selectedCategoryForAssignment && this.filteredReportsForAssignment.length === 0) {
        errorMessage = 'Selected category has no reports available for assignment';
      }
      
      this.notificationService.showError(errorMessage);
      return;
    }

    this.isAssigning = true;
    try {
      let reportIdsToAssign: number[] = [];
      
      if (this.assignmentMode === 'individual') {
        reportIdsToAssign = this.selectedReportIds;
      } else if (this.assignmentMode === 'category' && this.selectedCategoryForAssignment) {
        const categoryId = Number(this.selectedCategoryForAssignment);
        reportIdsToAssign = this.getReportsForCategory(categoryId)
          .map(report => report.id);
      }

      if (reportIdsToAssign.length === 0) {
        this.notificationService.showError('No reports found for assignment');
        return;
      }

      const request = {
        userIds: this.selectedUserIds,
        reportIds: reportIdsToAssign
      };
      
      console.log('Sending assignment request:', request);
      
      const response = await this.reportService.assignReportsToUsers(request).toPromise();
      if (response) {
        await this.loadUserReportAssignments();
        this.resetAssignmentForm();
        
        const assignmentType = this.assignmentMode === 'category' ? 'category' : 'individual reports';
        const reportCount = reportIdsToAssign.length;
        const userCount = this.selectedUserIds.length;
        
        this.notificationService.showSuccess(`Successfully assigned ${reportCount} reports to ${userCount} users via ${assignmentType}!`);
      }
    } catch (error) {
      console.error('Error assigning reports:', error);
      this.notificationService.showError('Error assigning reports. Please try again.');
    } finally {
      this.isAssigning = false;
    }
  }

  resetAssignmentForm(): void {
    console.log('Resetting assignment form...');
    
    this.selectedUserIds = [];
    this.selectedReportIds = [];
    this.selectedCategoryForAssignment = null;
    this.userSearchTerm = '';
    this.reportSearchTerm = '';
    this.filteredUsers = [...this.users];
    
    if (this.assignmentMode === 'category') {
      this.filteredReportsForAssignment = [];
    } else {
      this.filteredReportsForAssignment = [...this.reports];
    }
    
    setTimeout(() => {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(checkbox => {
        (checkbox as HTMLInputElement).checked = false;
      });
      
      const categorySelect = document.querySelector('select') as HTMLSelectElement;
      if (categorySelect) {
        categorySelect.value = '';
      }
    }, 100);
    
    console.log('Assignment form reset complete');
  }



  assignMoreReports(userId: string): void {
    this.setActiveUserReportsSubTab('assign');
    
    this.selectedUserIds = [userId];
    
    setTimeout(() => {
      const userCheckbox = document.getElementById(`user-${userId}`) as HTMLInputElement;
      if (userCheckbox) {
        userCheckbox.checked = true;
      }
    }, 100);
    
    this.selectedReportIds = [];
    this.reportSearchTerm = '';
    this.filterReportsForAssignment();
  }

  initiateRemoveAssignment(assignmentId: number): void {
    this.assignmentToRemove = assignmentId;
    this.showRemoveAssignmentConfirmation = true;
  }

  async confirmRemoveAssignment(): Promise<void> {
    if (this.assignmentToRemove === null) return;

    try {
      await this.reportService.removeUserReportAssignment(this.assignmentToRemove).toPromise();
      await this.loadUserReportAssignments();
      this.notificationService.showSuccess('Assignment removed successfully!');
    } catch (error) {
      console.error('Error removing assignment:', error);
      this.notificationService.showError('Error removing assignment. Please try again.');
    } finally {
      this.assignmentToRemove = null;
      this.showRemoveAssignmentConfirmation = false;
    }
  }

  cancelRemoveAssignment(): void {
    this.assignmentToRemove = null;
    this.showRemoveAssignmentConfirmation = false;
  }

  // Utility Methods
  async refreshData(): Promise<void> {
    await this.loadInitialData();
  }

  debugCategorySelection(): void {
    console.log('=== DEBUG CATEGORY SELECTION ===');
    console.log('Assignment mode:', this.assignmentMode);
    console.log('Selected category (raw):', this.selectedCategoryForAssignment);
    console.log('Selected category (number):', Number(this.selectedCategoryForAssignment));
    console.log('All categories:', this.categories);
    console.log('All reports:', this.reports);
    
    if (this.selectedCategoryForAssignment) {
      const categoryId = Number(this.selectedCategoryForAssignment);
      const categoryReports = this.getReportsForCategory(categoryId);
      console.log('Category reports:', categoryReports);
    }
    
    console.log('Filtered reports for assignment:', this.filteredReportsForAssignment);
    console.log('Can assign reports:', this.canAssignReports());
    console.log('================================');
  }

  async testApiConnection(): Promise<void> {
    try {
      await this.reportService.testConnection().toPromise();
      this.notificationService.showSuccess('API connection successful!');
    } catch (error) {
      console.error('API connection failed:', error);
      this.notificationService.showError('API connection failed. Please check your connection and try again.');
    }
  }
  //Department 
loadDepartments(): void {
  this.userService.getDepartments().subscribe({
    next: (departments) => {
      this.departments = departments;
    },
    error: (error) => {
      console.error('Error loading departments:', error);
      // Handle error (show notification, etc.)
    }
  });
}
onDepartmentSelectionChange(): void {
  // Clear all previous user selections when department changes
  this.selectedUserIds = [];
  
  if (this.selectedDepartmentId) {
    this.loadDepartmentUsers(this.selectedDepartmentId);
  } else {
    this.departmentUsers = [];
  }
}
/**
 * Load users for a specific department
 */
loadDepartmentUsers(departmentId: number): void {
  this.isLoadingDepartmentUsers = true;
  
  this.userService.getDepartmentUsers(departmentId).subscribe({
    next: (users) => {
      this.departmentUsers = users;
      this.isLoadingDepartmentUsers = false;
    },
    error: (error) => {
      console.error('Error loading department users:', error);
      this.isLoadingDepartmentUsers = false;
      // Handle error (show notification, etc.)
    }
  });
}
/**
 * Select all users from the selected department
 */
selectAllDepartmentUsers(): void {
  if (!this.selectedDepartmentId || this.departmentUsers.length === 0) {
    return;
  }

  // Add all department user IDs to selectedUserIds if not already selected
  this.departmentUsers.forEach(user => {
    if (!this.selectedUserIds.includes(user.id)) {
      this.selectedUserIds.push(user.id);
    }
  });

  // Optionally show a notification
  console.log(`Selected ${this.departmentUsers.length} users from department`);
}
/**
 * Get department name by ID
 */
getDepartmentName(departmentId: number | null): string {
  if (!departmentId) return '';
  
  const department = this.departments.find(d => Number(d.id) === Number(departmentId));
  return department ? department.name : '';
}


}



