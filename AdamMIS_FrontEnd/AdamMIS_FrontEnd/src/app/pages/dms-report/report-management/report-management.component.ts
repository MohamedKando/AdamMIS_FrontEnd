import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ReportService, RCategoryResponse, ReportResponse, UserReportResponse, User, UploadProgress } from '../../../services/report.service';

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
 private readonly DISPLAY_LIMIT = 10; // You can change this to 15 if preferred

  // ... existing constructor and methods ...
  activeUserReportsSubTab: string = 'assign';
  // New methods for displaying limited items in horizontal layout
  assignmentCategoryFilter: string = '';
  assignmentDateFilter: string = '';
    // NEW: Assignment mode and category selection
  assignmentMode: 'individual' | 'category' = 'individual';
  selectedCategoryForAssignment: number | null = null;
  getDisplayedUsers(): User[] {
    return this.filteredUsers.slice(0, this.DISPLAY_LIMIT);
  }

    /**
   * Handle assignment mode change
   */
onAssignmentModeChange(): void {
  console.log('Assignment mode changed to:', this.assignmentMode);
  this.resetAssignmentForm();
  
  // If switching to category mode, ensure reports are loaded properly
  if (this.assignmentMode === 'category') {
    // Clear filtered reports until a category is selected
    this.filteredReportsForAssignment = [];
    
    // If a category is already selected, load its reports
    if (this.selectedCategoryForAssignment) {
      this.loadReportsForSelectedCategory();
    }
  } else {
    // If switching to individual mode, show all reports
    this.filteredReportsForAssignment = [...this.reports];
  }
}
  /**
   * Handle category selection change
   */
onCategorySelectionChange(): void {
  console.log('Category selection changed:', this.selectedCategoryForAssignment);
  
  if (this.selectedCategoryForAssignment) {
    // Ensure it's a number
    this.selectedCategoryForAssignment = Number(this.selectedCategoryForAssignment);
    
    // Clear selected reports when switching categories
    this.selectedReportIds = [];
    
    // Load reports for the selected category
    this.loadReportsForSelectedCategory();
  } else {
    // If no category selected, clear the filtered reports
    this.filteredReportsForAssignment = [];
  }
  
  // Debug call
  this.debugCategorySelection();
}
private loadReportsForSelectedCategory(): void {
  console.log('Loading reports for category:', this.selectedCategoryForAssignment);
  console.log('All reports:', this.reports);
  
  if (this.selectedCategoryForAssignment) {
    // Ensure category ID is a number
    const categoryId = Number(this.selectedCategoryForAssignment);
    
    // Get reports for the selected category
    const categoryReports = this.reports.filter(report => {
      console.log(`Comparing report categoryId: ${report.categoryId} with selected: ${categoryId}`);
      return report.categoryId === categoryId;
    });
    
    console.log('Found category reports:', categoryReports);
    
    // Update the filtered reports for assignment to show only category reports
    this.filteredReportsForAssignment = categoryReports;
    
    // Clear any existing search term that might interfere
    this.reportSearchTerm = '';
  } else {
    // If no category selected, show all reports
    this.filteredReportsForAssignment = [...this.reports];
  }
}
   getReportCountForCategory(categoryId: number): number {
    return this.reports.filter(report => report.categoryId === categoryId).length;
  }

  /**
   * Get reports for a specific category
   */
  getReportsForCategory(categoryId: number): Report[] {
    return this.reports.filter(report => report.categoryId === categoryId);
  }

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId: number): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  }

  /**
   * Check if reports can be assigned
   */
  canAssignReports(): boolean {
    const hasUsers = this.selectedUserIds.length > 0;
    
    if (this.assignmentMode === 'individual') {
      return hasUsers && this.selectedReportIds.length > 0;
    } else if (this.assignmentMode === 'category') {
      return hasUsers && this.selectedCategoryForAssignment !== null;
    }
    
    return false;
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
  // Category management
  categories: Category[] = [];
  newCategory: Category = {
    id: 0,
    name: '',
    description: '',
    color: '#3498db'
  };
  isAddingCategory: boolean = false;
  
  // Frontend storage for category extra data (color & description)
  private categoryExtraData: Map<number, {color: string, description: string}> = new Map();

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
  
  // NEW: Search functionality for different sections
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
    private reportService: ReportService
  ) {
    this.activeTab = 'user-reports'; // Set default tab to Report Manager
  }

  ngOnInit(): void {
    this.loadInitialData();
  }
  setActiveUserReportsSubTab(subTab: string): void {
    this.activeUserReportsSubTab = subTab;
    
    // Load specific data based on sub-tab
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
  
  // Tab Management
    setActiveTab(tab: string): void {
    this.activeTab = tab;
    
    // Load data based on active tab
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
        // Set default sub-tab
        this.setActiveUserReportsSubTab('assign');
        break;
    }
  }
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

  // Initial Data Loading
  private async loadInitialData(): Promise<void> {
    try {
      await Promise.all([
        this.loadCategories(),
        this.loadReports(),
        this.loadUsers(),
        this.loadUserReportAssignments()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      alert('Error loading initial data. Please refresh the page.');
    }
  }

  // Category Management Methods
  private async loadCategories(): Promise<void> {
    if (this.isLoadingCategories) return;
    
    this.isLoadingCategories = true;
    try {
      const response = await this.reportService.getAllCategories().toPromise();
      this.categories = (response || []).map(cat => ({
        ...cat,
        // Add default color and description if not in extra data
        color: this.categoryExtraData.get(cat.id)?.color || '#3498db',
        description: this.categoryExtraData.get(cat.id)?.description || ''
      }));
      
      // Load extra data from localStorage if available
      this.loadCategoryExtraDataFromStorage();
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error loading categories. Please try again.');
      this.categories = [];
    } finally {
      this.isLoadingCategories = false;
    }
  }

  private loadCategoryExtraDataFromStorage(): void {
    const savedData = localStorage.getItem('categoryExtraData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        this.categoryExtraData = new Map(parsedData);
        
        // Update categories with saved data
        this.categories = this.categories.map(cat => ({
          ...cat,
          color: this.categoryExtraData.get(cat.id)?.color || cat.color || '#3498db',
          description: this.categoryExtraData.get(cat.id)?.description || cat.description || ''
        }));
      } catch (error) {
        console.error('Error loading category extra data:', error);
      }
    }
  }

  private saveCategoryExtraDataToStorage(): void {
    try {
      const dataToSave = Array.from(this.categoryExtraData.entries());
      localStorage.setItem('categoryExtraData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error('Error saving category extra data:', error);
    }
  }

  async addCategory(): Promise<void> {
    if (!this.newCategory.name.trim()) {
      alert('Please enter a category name');
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
        // Save extra data (color & description) to frontend storage
        this.categoryExtraData.set(response.id, {
          color: this.newCategory.color,
          description: this.newCategory.description
        });
        this.saveCategoryExtraDataToStorage();
        
        await this.loadCategories(); // Reload categories to get updated list
        this.resetCategoryForm();
        alert('Category added successfully!');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category. Please try again.');
    } finally {
      this.isAddingCategory = false;
    }
  }

  editCategory(category: Category): void {
    // Allow editing of color and description
    const newColor = prompt('Enter new color (hex format):', category.color);
    const newDescription = prompt('Enter new description:', category.description);
    
    if (newColor !== null && newDescription !== null) {
      // Update in frontend storage
      this.categoryExtraData.set(category.id, {
        color: newColor || category.color,
        description: newDescription || category.description
      });
      this.saveCategoryExtraDataToStorage();
      
      // Update in current categories array
      const categoryIndex = this.categories.findIndex(c => c.id === category.id);
      if (categoryIndex !== -1) {
        this.categories[categoryIndex] = {
          ...this.categories[categoryIndex],
          color: newColor || category.color,
          description: newDescription || category.description
        };
      }
      
      alert('Category updated successfully!');
    }
  }

  async deleteCategory(categoryId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const success = await this.reportService.deleteCategory(categoryId).toPromise();
      if (success) {
        // Remove from frontend storage
        this.categoryExtraData.delete(categoryId);
        this.saveCategoryExtraDataToStorage();
        
        await this.loadCategories(); // Reload categories
        alert('Category deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category. Please try again.');
    }
  }

  private resetCategoryForm(): void {
    this.newCategory = {
      id: 0,
      name: '',
      description: '',
      color: '#3498db'
    };
  }

  // Report Management Methods
  private async loadReports(): Promise<void> {
    if (this.isLoadingReports) return;
    
    this.isLoadingReports = true;
    try {
      const response = await this.reportService.getAllReports().toPromise();
      this.reports = response || [];
      this.filteredReports = [...this.reports];
      this.filteredReportsForAssignment = [...this.reports]; // Initialize filtered reports for assignment
    } catch (error) {
      console.error('Error loading reports:', error);
      alert('Error loading reports. Please try again.');
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
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.rpt')) {
      alert('Please select a valid .rpt file');
      return;
    }

    // Validate file size (e.g., max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    this.selectedFile = file;
    this.fileName = file.name;
  }

  async uploadReport(): Promise<void> {
    if (!this.selectedFile || !this.selectedCategoryId) {
      alert('Please select a file and category');
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
            // Reload reports to show the new upload
            this.loadReports();
            this.resetUploadForm();
            alert('Report uploaded successfully!');
          }
        },
        error: (error: any) => {
          console.error('Error uploading report:', error);
          alert('Error uploading report. Please try again.');
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
      alert('Error uploading report. Please try again.');
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

  // Report Filtering
  filterReports(): void {
    this.filteredReports = this.reports.filter(report => {
      const matchesCategory = !this.selectedFilterCategory || 
        report.categoryId.toString() === this.selectedFilterCategory;
      const matchesSearch = !this.searchTerm || 
        report.fileName.toLowerCase().includes(this.searchTerm.toLowerCase());
      
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
  
  // If in category mode, filter from category reports only
  if (this.assignmentMode === 'category' && this.selectedCategoryForAssignment) {
    const categoryId = Number(this.selectedCategoryForAssignment);
    reportsToFilter = this.reports.filter(report => 
      report.categoryId === categoryId
    );
  }
  
  this.filteredReportsForAssignment = reportsToFilter.filter(report => {
    const matchesSearch = !this.reportSearchTerm || 
      report.fileName.toLowerCase().includes(this.reportSearchTerm.toLowerCase()) ||
      report.categoryName.toLowerCase().includes(this.reportSearchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  console.log('Filtered reports for assignment:', this.filteredReportsForAssignment);
}

  // NEW: User Overview Search
  filterUsersWithReports(): void {
    this.filteredUsersWithReports = this.usersWithReports.filter(user => {
      const matchesSearch = !this.userOverviewSearchTerm || 
        user.userName.toLowerCase().includes(this.userOverviewSearchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }

  // NEW: Assignment Search
filterUserReportAssignments(): void {
    this.filteredUserReportAssignments = this.userReportAssignments.filter(assignment => {
      // Search term filter
      const matchesSearch = !this.assignmentSearchTerm || 
        assignment.userName.toLowerCase().includes(this.assignmentSearchTerm.toLowerCase()) ||
        assignment.reportFileName.toLowerCase().includes(this.assignmentSearchTerm.toLowerCase()) ||
        assignment.categoryName.toLowerCase().includes(this.assignmentSearchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = !this.assignmentCategoryFilter || 
        assignment.categoryName === this.assignmentCategoryFilter;
      
      // Date filter
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

  // New method for viewing assignment details
  viewAssignmentDetails(assignment: UserReportAssignment): void {
    // TODO: Implement assignment details modal/view
    console.log('View assignment details:', assignment);
    alert(`Assignment Details:\n\nUser: ${assignment.userName}\nReport: ${assignment.reportFileName}\nCategory: ${assignment.categoryName}\nAssigned: ${assignment.assignedAt}\nAssigned By: ${assignment.assignedBy}\nStatus: ${assignment.isActive ? 'Active' : 'Inactive'}`);
  }

viewReport(report: Report): void {
  this.reportService.editReport(report.id).subscribe(
    response => {
      console.log('Report editor opened:', response.message);
      // Optionally show a success message
      alert('Report editor has been opened. Make your changes and save the file.');
    },
    error => {
      console.error('Error opening report editor:', error);
      alert('Could not open report editor. Please try again.');
    }
  );
}

  async deleteReport(reportId: number): Promise<void> {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const success = await this.reportService.deleteReport(reportId).toPromise();
      if (success) {
        await this.loadReports(); // Reload reports
        alert('Report deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report. Please try again.');
    }
  }

  // User Management Methods
  private async loadUsers(): Promise<void> {
    if (this.isLoadingUsers) return;
    
    this.isLoadingUsers = true;
    try {
      const response = await this.reportService.getAllUsers().toPromise();
      this.users = response || [];
      this.filteredUsers = [...this.users]; // Initialize filtered users
      this.updateUsersWithReports();
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users. Please try again.');
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
    
    // Initialize filtered users with reports
    this.filteredUsersWithReports = [...this.usersWithReports];
  }

  private async loadUserReportAssignments(): Promise<void> {
    if (this.isLoadingAssignments) return;
    
    this.isLoadingAssignments = true;
    try {
      // Load assignments for all users
      const allAssignments: UserReportAssignment[] = [];
      
      for (const user of this.users) {
        const userReports = await this.reportService.getUserReports(user.id).toPromise();
        if (userReports) {
          allAssignments.push(...userReports);
        }
      }
      
      this.userReportAssignments = allAssignments;
      this.filteredUserReportAssignments = [...this.userReportAssignments]; // Initialize filtered assignments
      this.updateUsersWithReports();
    } catch (error) {
      console.error('Error loading user report assignments:', error);
      alert('Error loading user report assignments. Please try again.');
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
    
    alert(errorMessage);
    return;
  }

  this.isAssigning = true;
  try {
    let reportIdsToAssign: number[] = [];
    
    if (this.assignmentMode === 'individual') {
      reportIdsToAssign = this.selectedReportIds;
    } else if (this.assignmentMode === 'category' && this.selectedCategoryForAssignment) {
      // Get all report IDs for the selected category
      const categoryId = Number(this.selectedCategoryForAssignment);
      reportIdsToAssign = this.getReportsForCategory(categoryId)
        .map(report => report.id);
    }

    if (reportIdsToAssign.length === 0) {
      alert('No reports found for assignment');
      return;
    }

    const request = {
      userIds: this.selectedUserIds,
      reportIds: reportIdsToAssign
    };
    
    console.log('Sending assignment request:', request);
    
    const response = await this.reportService.assignReportsToUsers(request).toPromise();
    if (response) {
      await this.loadUserReportAssignments(); // Reload assignments
      this.resetAssignmentForm();
      
      const assignmentType = this.assignmentMode === 'category' ? 'category' : 'individual reports';
      const reportCount = reportIdsToAssign.length;
      const userCount = this.selectedUserIds.length;
      
      alert(`Successfully assigned ${reportCount} reports to ${userCount} users via ${assignmentType}!`);
    }
  } catch (error) {
    console.error('Error assigning reports:', error);
    alert('Error assigning reports. Please try again.');
  } finally {
    this.isAssigning = false;
  }
}
// Update the resetAssignmentForm method:
resetAssignmentForm(): void {
  console.log('Resetting assignment form...');
  
  this.selectedUserIds = [];
  this.selectedReportIds = [];
  this.selectedCategoryForAssignment = null;
  this.userSearchTerm = '';
  this.reportSearchTerm = '';
  this.filteredUsers = [...this.users];
  
  // Handle filtered reports based on assignment mode
  if (this.assignmentMode === 'category') {
    this.filteredReportsForAssignment = []; // Clear until category is selected
  } else {
    this.filteredReportsForAssignment = [...this.reports]; // Show all reports for individual mode
  }
  
  // Clear checkboxes
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      (checkbox as HTMLInputElement).checked = false;
    });
    
    // Clear select dropdown
    const categorySelect = document.querySelector('select') as HTMLSelectElement;
    if (categorySelect) {
      categorySelect.value = '';
    }
  }, 100);
  
  console.log('Assignment form reset complete');
}
  viewUserReports(userId: string): void {
    // Switch to history tab and filter by user
    this.setActiveUserReportsSubTab('history');
    
    // Filter assignments for this user
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.assignmentSearchTerm = user.userName;
      this.filterUserReportAssignments();
    }
  }

  assignMoreReports(userId: string): void {
    // Switch to assign tab and pre-select the user
    this.setActiveUserReportsSubTab('assign');
    
    // Pre-select the user
    this.selectedUserIds = [userId];
    
    // Update the checkbox state
    setTimeout(() => {
      const userCheckbox = document.getElementById(`user-${userId}`) as HTMLInputElement;
      if (userCheckbox) {
        userCheckbox.checked = true;
      }
    }, 100);
    
    // Clear other selections
    this.selectedReportIds = [];
    this.reportSearchTerm = '';
    this.filterReportsForAssignment();
  }

  async removeAssignment(assignmentId: number): Promise<void> {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    try {
      const success = await this.reportService.removeUserReportAssignment(assignmentId).toPromise();
      if (success) {
        await this.loadUserReportAssignments(); // Reload assignments
        alert('Assignment removed successfully!');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      alert('Error removing assignment. Please try again.');
    }
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
      alert('API connection successful!');
    } catch (error) {
      console.error('API connection failed:', error);
      alert('API connection failed. Please check your connection and try again.');
    }
  }
}