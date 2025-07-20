import { Component, OnInit } from '@angular/core';
import { ReportService, UserReportResponse, UploadProgress, RCategoryResponse } from '../../../services/report.service';
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
  categories: RCategoryResponse[] = [];
  pinnedReportIds: Set<number> = new Set(); // Store pinned report IDs
  
  // State properties
  loading: boolean = false;
  error: string = '';
  currentUserId: string = '';
  
  // UI properties
  searchTerm: string = '';
  currentView: 'table' | 'grid' = 'table';
  activeFilter: string = 'all';
  showUploadSection: boolean = false;
  
  // Properties for report generation
  generatingReportId: number | null = null;
  generationProgress: number = 0;
  generationStatus: string = '';
  generationMessage: string = '';

  constructor(
    private reportService: ReportService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadCategories();
    this.loadPinnedReports();
  }

  getCurrentUser(): void {
    // Get user ID from JWT token via auth service
    this.currentUserId = this.authService.getUserId();
    
    if (this.currentUserId) {
      this.loadReports();
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
        this.filteredReports = [...this.reports]; // Initialize filtered reports
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

  // Pin functionality
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
    
    // Optional: Show a toast notification
    // this.showToast(`Report ${action} successfully`);
  }

  // Search and filter methods
  onSearch(): void {
    this.applyFilters();
  }

  filterReports(filter: string): void {
    this.activeFilter = filter;
    this.applyFilters();
  }

  private applyFilters(): void {
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

  // View toggle
  toggleView(view: 'table' | 'grid'): void {
    this.currentView = view;
  }

  // Statistics methods
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

  // Report generation methods
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
        
        alert(`Report generated successfully: ${response.fileName}\nGenerated at: ${new Date(response.generatedAt).toLocaleString()}`);
        
        setTimeout(() => {
          this.generationStatus = '';
          this.generationMessage = '';
          this.generationProgress = 0;
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Report generation failed:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        
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

  // Method for file upload and report generation
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

  // Method to handle report generation with progress tracking
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
          // Optionally refresh the reports list
          // this.loadReports();
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

  // Simple version without progress tracking
  generateReportSimple(file: File): void {
    this.loading = true;
    this.error = '';

    this.reportService.generateReportSimple(file).subscribe({
      next: (response) => {
        console.log('Report generated successfully!', response);
        this.loading = false;
        // Show success message or refresh reports
      },
      error: (error: any) => {
        this.error = `Failed to generate report: ${error.message}`;
        this.loading = false;
        console.error('Error generating report:', error);
      }
    });
  }

  // Method to handle file selection from HTML template
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.generateReport(file);
    }
  }

  // Utility methods
  refreshReports(): void {
    this.loadReports();
  }

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