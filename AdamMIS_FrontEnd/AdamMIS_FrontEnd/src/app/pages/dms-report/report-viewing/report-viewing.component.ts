import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // Add this import
import { ReportService, UserReportResponse, UploadProgress, RCategoryResponse } from '../../../services/report.service';
import { MetabaseService, UserMetabaseResponse } from '../../../services/metabase.service';
import { AuthService } from '../../../services/auth.service';

// Add this interface if it's not imported from the service
interface GenerateReportResponse {
  message: string;
  fileName: string;
  generatedAt: string;
}

// Extended interface to include pinned status
interface ExtendedUserReportResponse extends UserReportResponse {
  isPinned?: boolean;
}

@Component({
  selector: 'app-report-viewing',
  templateUrl: './report-viewing.component.html',
  styleUrls: ['./report-viewing.component.css']
})
export class ReportViewingComponent implements OnInit {
  // Data properties
  reports: ExtendedUserReportResponse[] = [];
  filteredReports: ExtendedUserReportResponse[] = [];
  urls: UserMetabaseResponse[] = [];
  filteredUrls: UserMetabaseResponse[] = [];
  categories: RCategoryResponse[] = [];
  pinnedReportIds: Set<number> = new Set(); // Store pinned report IDs
  
  // State properties
  loading: boolean = false;
  error: string = '';
  currentUserId: string = '';
  
  // UI properties
  searchTerm: string = '';
  currentView: 'reports' | 'urls' = 'reports'; // Changed from 'table' | 'grid'
  displayMode: 'table' | 'grid' = 'table'; // New property for reports display mode
  activeFilter: string = 'all';
  showUploadSection: boolean = false;
  
  // Properties for report generation
  generatingReportId: number | null = null;
  generationProgress: number = 0;
  generationStatus: string = '';
  generationMessage: string = '';

constructor(
  private reportService: ReportService,
  private metabaseService: MetabaseService,
  private authService: AuthService,
  private route: ActivatedRoute // Add this line
) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadCategories();
    this.loadPinnedReports();
this.route.queryParams.subscribe(params => {
    if (params['tab'] === 'metabase') {
      this.currentView = 'urls'; // Switch to Metabase view
    } else if (params['tab'] === 'cr-reports') {
      this.currentView = 'reports'; // Switch to CR Reports view
    }
    // Load data based on current view
    this.loadData();
  });
  }

  getCurrentUser(): void {
    // Get user ID from JWT token via auth service
    this.currentUserId = this.authService.getUserId();
    
    if (this.currentUserId) {
      this.loadData();
    } else {
      this.error = 'User not authenticated';
    }
  }

  loadCategories(): void {
    this.reportService.getAllCategories().subscribe({
      next: (categories: RCategoryResponse[]) => {
        this.categories = categories;
      },
      error: (error: any) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  // Load pinned reports from localStorage or backend
  loadPinnedReports(): void {
    const pinnedReports = localStorage.getItem(`pinnedReports_${this.currentUserId}`);
    if (pinnedReports) {
      this.pinnedReportIds = new Set(JSON.parse(pinnedReports));
    }
  }

  // Save pinned reports to localStorage
  savePinnedReports(): void {
    localStorage.setItem(
      `pinnedReports_${this.currentUserId}`, 
      JSON.stringify([...this.pinnedReportIds])
    );
  }

  // New unified data loading method
  loadData(): void {
    if (this.currentView === 'reports') {
      this.loadReports();
    } else {
      this.loadUrls();
    }
  }

  loadReports(): void {
    if (!this.currentUserId) {
      this.error = 'User ID not found';
      return;
    }

    this.loading = true;
    this.error = '';

    this.reportService.getUserReports(this.currentUserId).subscribe({
      next: (data: UserReportResponse[]) => {
        // Add pinned status to each report
        this.reports = data.map(report => ({
          ...report,
          isPinned: this.pinnedReportIds.has(report.reportId)
        }));
        this.applyFilters();
        this.loading = false;
        console.log('Reports loaded:', this.reports);
      },
      error: (error: any) => {
        this.error = 'Failed to load reports';
        this.loading = false;
        console.error('Error loading reports:', error);
      }
    });
  }

  // New method to load URLs
  loadUrls(): void {
  if (!this.currentUserId) {
    this.error = 'User ID not found';
    return;
  }

  this.loading = true;
  this.error = '';

  // Use getAllAssignments and filter by current user
  this.metabaseService.getAllAssignments().subscribe({
    next: (data: UserMetabaseResponse[]) => {
      // Filter assignments for the current user
      this.urls = data.filter(assignment => assignment.userId === this.currentUserId);
      this.applyFilters();
      this.loading = false;
      console.log('URLs loaded:', this.urls);
    },
    error: (error: any) => {
      this.error = 'Failed to load URLs';
      this.loading = false;
      console.error('Error loading URLs:', error);
    }
  });
}

  // Pin functionality (only for reports)
  onTogglePin(reportId: number): void {
    const report = this.reports.find(r => r.reportId === reportId);
    if (!report) return;

    // Toggle pinned status
    if (this.pinnedReportIds.has(reportId)) {
      this.pinnedReportIds.delete(reportId);
      report.isPinned = false;
    } else {
      this.pinnedReportIds.add(reportId);
      report.isPinned = true;
    }

    // Update the report in filteredReports as well
    const filteredReport = this.filteredReports.find(r => r.reportId === reportId);
    if (filteredReport) {
      filteredReport.isPinned = report.isPinned;
    }

    // Save to localStorage
    this.savePinnedReports();

    // Show feedback
    const action = report.isPinned ? 'pinned' : 'unpinned';
    console.log(`Report ${report.reportFileName} has been ${action}`);
  }

  // Search and filter methods
  onSearch(): void {
    this.applyFilters();
  }

  filterItems(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  private applyFilters(): void {
    if (this.currentView === 'reports') {
      this.applyReportsFilters();
    } else {
      this.applyUrlsFilters();
    }
  }

  private applyReportsFilters(): void {
    let filtered = [...this.reports];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(report => 
        report.reportFileName.toLowerCase().includes(search) ||
        report.categoryName.toLowerCase().includes(search) ||
        report.assignedBy.toLowerCase().includes(search)
      );
    }

    // Apply category filter
    if (this.activeFilter !== 'all') {
      if (this.activeFilter === 'pinned') {
        filtered = filtered.filter(report => report.isPinned);
      } else {
        filtered = filtered.filter(report => 
          report.categoryName.toLowerCase() === this.activeFilter
        );
      }
    }

    this.filteredReports = filtered;
  }

  private applyUrlsFilters(): void {
    let filtered = [...this.urls];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(url => 
        url.metabaseTitle.toLowerCase().includes(search) ||
        url.metabaseUrl.toLowerCase().includes(search) ||
        url.assignedBy.toLowerCase().includes(search)
      );
    }

    // Apply category filter (if URLs have categories)
    if (this.activeFilter !== 'all') {
      // You can implement URL category filtering here if needed
      // For now, we'll just keep all filtered URLs
    }

    this.filteredUrls = filtered;
  }

  // View toggle methods
  toggleView(view: 'reports' | 'urls'): void {
    if (this.currentView !== view) {
      this.currentView = view;
      this.activeFilter = 'all'; // Reset filter when switching views
      this.searchTerm = ''; // Reset search when switching views
      this.loadData(); // Load appropriate data
    }
  }

  // Display mode toggle (only for reports)
  toggleDisplayMode(mode: 'table' | 'grid'): void {
    this.displayMode = mode;
  }

  // Helper methods for search placeholder
  getSearchPlaceholder(): string {
    if (this.currentView === 'reports') {
      return 'Search reports by name, category, or assigned by...';
    } else {
      return 'Search URLs by title, URL, or assigned by...';
    }
  }

  // Statistics methods
  getCurrentViewTotal(): number {
    return this.currentView === 'reports' ? this.reports.length : this.urls.length;
  }

  getCurrentViewCategories(): number {
    if (this.currentView === 'reports') {
      return this.getUniqueCategories();
    } else {
      // For URLs, you might want to implement URL categories
      return 1; // Placeholder
    }
  }

  getCurrentCategories(): string[] {
    if (this.currentView === 'reports') {
      return this.getUniqueCategory();
    } else {
      // Return URL categories if available
      return []; // Placeholder
    }
  }

  getTotalReports(): number {
    return this.reports.length;
  }

  getPinnedReports(): number {
    return this.reports.filter(report => report.isPinned).length;
  }

  getUniqueCategories(): number {
    const uniqueCategories = new Set(this.reports.map(report => report.categoryName));
    return uniqueCategories.size;
  }

  getUniqueCategory(): string[] {
    const uniqueCategories = new Set(this.reports.map(report => report.categoryName));
    return Array.from(uniqueCategories);
  }

  getThisWeekReports(): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return this.reports.filter(report => {
      const assignedDate = new Date(report.assignedAt);
      return assignedDate >= oneWeekAgo;
    }).length;
  }

  getAssignedUrls(): number {
    return this.urls.length;
  }

  // Report generation methods (unchanged)
  onViewReport(reportId: number): void {
    console.log('Starting report generation for ID:', reportId);
    
    // Show loading state
    this.generatingReportId = reportId;
    this.generationProgress = 0;
    this.generationStatus = 'processing';
    this.generationMessage = 'Initializing report generation...';
    this.error = '';

    this.reportService.generateReportById(reportId).subscribe({
      next: (response: GenerateReportResponse) => {
        console.log('✅ Report generated successfully:', response);
        
        // Update UI
        this.generatingReportId = null;
        this.generationProgress = 100;
        this.generationStatus = 'completed';
        this.generationMessage = response.message;
        
        setTimeout(() => {
          this.generationStatus = '';
          this.generationMessage = '';
          this.generationProgress = 0;
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Report generation failed:', error);
        
        // Update UI
        this.generatingReportId = null;
        this.generationProgress = 0;
        this.generationStatus = 'error';
        this.generationMessage = error.message || 'Report generation failed';
        this.error = error.message || 'Report generation failed';
        
        alert(`Report generation failed: ${error.message}`);
      }
    });
  }

  // URL handling methods
  onViewUrl(url: string): void {
    window.open(url, '_blank');
  }

  onCopyUrl(url: string): void {
    navigator.clipboard.writeText(url).then(() => {
      console.log('URL copied to clipboard');
      // You can show a toast notification here
      this.showToast('URL copied to clipboard!', 'info');
    }).catch(err => {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        this.showToast('URL copied to clipboard!', 'info');
      } catch (err) {
        console.error('Fallback: Failed to copy URL:', err);
      }
      document.body.removeChild(textArea);
    });
  }

  // Toast notification method
  showToast(message: string, type: string = 'info'): void {
    // Simple toast implementation - you can enhance this
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    
    container.appendChild(toast);
    
    setTimeout(() => {
      if (container && container.contains(toast)) {
        container.removeChild(toast);
        if (container.children.length === 0 && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }, 3000);
  }

  // File upload and report generation methods (unchanged)
  onUploadAndGenerateReport(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.rpt';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.generateReport(file);
      }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  generateReport(file: File, reportId?: number): void {
    this.generatingReportId = reportId || null;
    this.generationProgress = 0;
    this.generationStatus = '';
    this.generationMessage = '';
    this.error = '';

    this.reportService.generateReport(file).subscribe({
      next: (progress: UploadProgress) => {
        this.generationProgress = progress.progress;
        this.generationStatus = progress.status;
        this.generationMessage = progress.message || '';

        if (progress.status === 'completed') {
          console.log('Report generated successfully!', progress.data);
          this.generatingReportId = null;
        }
      },
      error: (error: any) => {
        this.error = `Failed to generate report: ${error.message}`;
        this.generatingReportId = null;
        this.generationProgress = 0;
        this.generationStatus = '';
        this.generationMessage = '';
        console.error('Error generating report:', error);
      }
    });
  }

  generateReportSimple(file: File): void {
    this.loading = true;
    this.error = '';

    this.reportService.generateReportSimple(file).subscribe({
      next: (response) => {
        console.log('Report generated successfully!', response);
        this.loading = false;
      },
      error: (error: any) => {
        this.error = `Failed to generate report: ${error.message}`;
        this.loading = false;
        console.error('Error generating report:', error);
      }
    });
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.generateReport(file);
    }
  }

  // Refresh methods
  refreshReports(): void {
    if (this.currentView === 'reports') {
      this.loadReports();
    }
  }

  refreshUrls(): void {
    if (this.currentView === 'urls') {
      this.loadUrls();
    }
  }

  // Utility methods
  getCategoryClass(category: string): string {
    return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
  }

  isGenerating(reportId: number): boolean {
    return this.generatingReportId === reportId;
  }

  getGenerationProgress(reportId: number): number {
    return this.isGenerating(reportId) ? this.generationProgress : 0;
  }

  trackByReportId(index: number, report: ExtendedUserReportResponse): number {
    return report.reportId;
  }

  trackByUrlId(index: number, url: UserMetabaseResponse): number {
    return url.id;
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}