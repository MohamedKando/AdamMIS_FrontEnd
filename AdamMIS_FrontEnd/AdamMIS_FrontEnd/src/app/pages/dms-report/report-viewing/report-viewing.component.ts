import { Component, OnInit } from '@angular/core';
import { ReportService, UserReportResponse, UploadProgress } from '../../../services/report.service';
import { AuthService } from '../../../services/auth.service';

// Add this interface if it's not imported from the service
interface GenerateReportResponse {
  message: string;
  fileName: string;
  generatedAt: string;
}

@Component({
  selector: 'app-report-viewing',
  templateUrl: './report-viewing.component.html',
  styleUrls: ['./report-viewing.component.css']
})
export class ReportViewingComponent implements OnInit {
  reports: UserReportResponse[] = [];
  loading: boolean = false;
  error: string = '';
  currentUserId: string = '';
  
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

  loadReports(): void {
    if (!this.currentUserId) {
      this.error = 'User ID not found';
      return;
    }

    this.loading = true;
    this.error = '';

    this.reportService.getUserReports(this.currentUserId).subscribe({
      next: (data: UserReportResponse[]) => {
        this.reports = data;
        this.loading = false;
      },
      error: (error: any) => {
        this.error = 'Failed to load reports';
        this.loading = false;
        console.error('Error loading reports:', error);
      }
    });
  }

  // Fixed: Generate report by ID without file upload
onViewReport(reportId: number): void {
  // Show loading state
  this.generatingReportId = reportId;
  this.generationProgress = 0;
  this.generationStatus = 'processing';
  this.generationMessage = 'Initializing report generation...';
  this.error = '';

  this.reportService.generateReportById(reportId).subscribe({
    next: (response: GenerateReportResponse) => {
      console.log('Report generated successfully:', response);
      
      // Update UI
      this.generatingReportId = null;
      this.generationProgress = 100;
      this.generationStatus = 'completed';
      this.generationMessage = response.message;
      
      // Show success message
      alert(`Report generated successfully: ${response.fileName}\nGenerated at: ${new Date(response.generatedAt).toLocaleString()}`);
      
      // Clear status after 3 seconds
      setTimeout(() => {
        this.generationStatus = '';
        this.generationMessage = '';
        this.generationProgress = 0;
      }, 3000);
    },
    error: (error) => {
      console.error('Report generation failed:', error);
      
      // Update UI
      this.generatingReportId = null;
      this.generationProgress = 0;
      this.generationStatus = 'error';
      this.generationMessage = error.message || 'Report generation failed';
      this.error = error.message || 'Report generation failed';
      
      // Show error message
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

  onDownloadReport(reportId: number): void {
    // Handle download report action
    console.log('Downloading report:', reportId);
    // Implement download logic here
    // Example: this.reportService.downloadReport(reportId).subscribe(...);
  }

  refreshReports(): void {
    this.loadReports();
  }

  getCategoryClass(category: string): string {
    return `category-${category.toLowerCase()}`;
  }

  // Helper method to check if a report is currently being generated
  isGenerating(reportId: number): boolean {
    return this.generatingReportId === reportId;
  }

  // Helper method to get progress for a specific report
  getGenerationProgress(reportId: number): number {
    return this.isGenerating(reportId) ? this.generationProgress : 0;
  }
}