import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EmployeeService, EmployeeResponse,
   EmployeeHRRequest, EmployeeDepartmentHeadRequest, 
   EmployeeITRequest, EmployeeCEORequest, DepartmentResponse, 
   WorkflowStatistics  } from '../../../services/employee.service';
import { NotificationService } from '../../../Notfications/notification.service';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  count: number;
  isActive: boolean;
  isCompleted: boolean;
  isAuthorized: boolean;
}
interface UserRoleInfo {
  primaryRole: string;
  allRoles: string[];
  departmentId?: number;
  departmentName?: string;
}
@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.css']
})
export class EmployeeFormComponent implements OnInit {
  // Form and data properties
  hrForm!: FormGroup;
  departmentForm!: FormGroup;
  itForm!: FormGroup;
  ceoForm!: FormGroup;
  
  // Component state
  currentStep: string = 'HR';
  selectedStep: string = 'HR';
  employeeId: string | null = null;
  employee: EmployeeResponse | null = null;
  departments: DepartmentResponse[] = [];
  workflowSteps: WorkflowStep[] = [];
  employeesList: EmployeeResponse[] = [];
  isLoading = false;
  isFormReadonly = false;
  canEditCurrentStep = false;

  // User context - You'll need to inject this from your auth service
  currentUserRole: string = ''; // Primary role for display
  currentUserRoles: string[] = []; // All roles the user has
  currentUserDepartmentId: number | null = null;
  currentUserDepartmentName: string | null = null;

  // File sharing options
  fileSharingOptions = [
    { value: 'None', label: 'None' },
    { value: 'ReadOnly', label: 'Read Only' },
    { value: 'FullControl', label: 'Full Control' }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: NotificationService
    // Inject your auth service here to get user context
  ) {
    this.initializeForms();
    // TODO: Get current user context from auth service
    this.getCurrentUserContext();
  }

  ngOnInit() {
    this.loadDepartments();
    this.loadWorkflowStatistics();
    this.handleRouteParams();
  }


  private async getCurrentUserContext() {
    try {
      const response = await this.employeeService.getCurrentUserRole().toPromise();
      if (response) {
        this.currentUserRole = response.primaryRole || '';
        this.currentUserRoles = response.allRoles || [];
        this.currentUserDepartmentId = response.departmentId || null;
        this.currentUserDepartmentName = response.departmentName || null;
        
        console.log('User Role Info:', response);
      } else {
        // Handle undefined response
        this.currentUserRole = '';
        this.currentUserRoles = [];
        this.currentUserDepartmentId = null;
        this.currentUserDepartmentName = null;
      }
    } catch (error) {
      console.error('Failed to get user context:', error);
      this.currentUserRole = '';
      this.currentUserRoles = [];
      this.currentUserDepartmentId = null;
      this.currentUserDepartmentName = null;
    }
  }

  private initializeForms() {
    this.hrForm = this.fb.group({
      employeeNumber: ['', [Validators.required, Validators.maxLength(50)]],
      nameArabic: ['', [Validators.required, Validators.maxLength(200)]],
      nameEnglish: ['', [Validators.required, Validators.maxLength(200)]],
      personalEmail: ['', [Validators.required, Validators.email]],
      contactPhone: [''],
      payrollNumber: [''],
      departmentId: [0, [Validators.required, Validators.min(1)]],
      isMedical: [false]
    });

    this.departmentForm = this.fb.group({
      qualification: [''],
      specialty: [''],
      medicalServiceCode: [''],
      doctorStatus: [''],
      seniorDoctorName: [''],
      medicalProfileType: [''],
      systemPermissions: ['', Validators.required]
    });

    this.itForm = this.fb.group({
      internetAccess: [false],
      externalEmail: [false],
      internalEmail: [false],
      filesSharing: ['None', Validators.required],
      networkId: [''],
      emailId: ['']
    });

    this.ceoForm = this.fb.group({
      ceoSignature: ['']
    });
  }

  public handleRouteParams() {
    this.employeeId = this.route.snapshot.paramMap.get('id');
    const step = this.route.snapshot.paramMap.get('step');
    
    if (step && this.isAuthorizedForStep(step)) {
      this.selectedStep = step;
      this.loadEmployeesByStep(step);
    } else if (this.employeeId) {
      this.loadEmployee(this.employeeId);
    } else {
      // Default to user's authorized step
      this.selectedStep = this.getDefaultStep();
      this.loadEmployeesByStep(this.selectedStep);
    }
  }

  public isAuthorizedForStep(step: string): boolean {
    switch (step) {
      case 'HR':
        return this.currentUserRoles.includes('HR');
      case 'DepartmentHead':
        return this.currentUserRoles.includes('DepartmentHead');
      case 'IT':
        return this.currentUserRoles.includes('IT');
      case 'CEO':
        return this.currentUserRoles.includes('CEO');
      default:
        return false;
    }
  }

   public getDefaultStep(): string {
    // Return the first available step based on user roles
    if (this.currentUserRoles.includes('HR')) return 'HR';
    if (this.currentUserRoles.includes('DepartmentHead')) return 'DepartmentHead';
    if (this.currentUserRoles.includes('IT')) return 'IT';
    if (this.currentUserRoles.includes('CEO')) return 'CEO';
    return 'HR'; // Fallback
  }

  private async loadDepartments() {
    try {
      this.departments = await this.employeeService.getAllDepartments().toPromise() || [];
    } catch (error) {
      this.toastr.showError('Failed to load departments');
    }
  }

   private async loadWorkflowStatistics() {
    try {
      const stats = await this.employeeService.getWorkflowStatistics().toPromise() || {};
      this.workflowSteps = [
        {
          id: 'HR',
          title: 'HR Information',
          description: 'Basic employee information',
          icon: 'fas fa-user-plus',
          count: stats['HR_Step'] || 0,
          isActive: false,
          isCompleted: false,
          isAuthorized: this.currentUserRoles.includes('HR')
        },
        {
          id: 'DepartmentHead',
          title: 'Department Head',
          description: this.getDepartmentStepDescription(),
          icon: 'fas fa-building',
          count: stats['Department_Step'] || 0,
          isActive: false,
          isCompleted: false,
          isAuthorized: this.currentUserRoles.includes('DepartmentHead')
        },
        {
          id: 'IT',
          title: 'IT Information',
          description: 'System access and permissions',
          icon: 'fas fa-laptop',
          count: stats['IT_Step'] || 0,
          isActive: false,
          isCompleted: false,
          isAuthorized: this.currentUserRoles.includes('IT')
        },
        {
          id: 'CEO',
          title: 'CEO Approval',
          description: 'Final approval and signature',
          icon: 'fas fa-crown',
          count: stats['CEO_Step'] || 0,
          isActive: false,
          isCompleted: false,
          isAuthorized: this.currentUserRoles.includes('CEO')
        }
      ];
    } catch (error) {
      this.toastr.showError('Failed to load workflow statistics');
    }
  }
    private getDepartmentStepDescription(): string {
    // Special roles show generic description, regular department heads show their department
    if (this.currentUserRoles.includes('HR') || 
        this.currentUserRoles.includes('IT') || 
        this.currentUserRoles.includes('CEO')) {
      return 'Department specific information';
    }
    
    return this.currentUserDepartmentName ? 
      `${this.currentUserDepartmentName} department information` : 
      'Department specific information';
  }

  private async loadEmployee(id: string) {
    try {
      this.isLoading = true;
      const result = await this.employeeService.getEmployeeById(id).toPromise();
      this.employee = result || null;
      
      if (this.employee) {
        this.currentStep = this.employee.currentStep;
        this.populateFormsFromEmployee();
        this.updateWorkflowSteps();
        await this.checkEditPermissions();
      }
    } catch (error) {
      this.toastr.showError('Failed to load employee');
    } finally {
      this.isLoading = false;
    }
  }


  private async loadEmployeesByStep(step: string) {
    try {
      this.isLoading = true;
      
      // The backend now handles filtering automatically based on user permissions
      this.employeesList = await this.employeeService.getEmployeesByStep(step).toPromise() || [];
      
    } catch (error) {
      this.toastr.showError('Failed to load employees');
    } finally {
      this.isLoading = false;
    }
  }

  private populateFormsFromEmployee() {
    if (!this.employee) return;

    // Populate HR form
    this.hrForm.patchValue({
      employeeNumber: this.employee.employeeNumber,
      nameArabic: this.employee.nameArabic,
      nameEnglish: this.employee.nameEnglish,
      personalEmail: this.employee.personalEmail,
      contactPhone: this.employee.contactPhone,
      payrollNumber: this.employee.payrollNumber,
      departmentId: this.employee.departmentId,
      isMedical: this.employee.isMedical
    });

    // Populate Department form
    this.departmentForm.patchValue({
      qualification: this.employee.qualification,
      specialty: this.employee.specialty,
      medicalServiceCode: this.employee.medicalServiceCode,
      doctorStatus: this.employee.doctorStatus,
      seniorDoctorName: this.employee.seniorDoctorName,
      medicalProfileType: this.employee.medicalProfileType,
      systemPermissions: this.employee.systemPermissions
    });

    // Populate IT form
    this.itForm.patchValue({
      internetAccess: this.employee.internetAccess,
      externalEmail: this.employee.externalEmail,
      internalEmail: this.employee.internalEmail,
      filesSharing: this.employee.filesSharing || 'None',
      networkId: this.employee.networkId,
      emailId: this.employee.emailId
    });

    // Populate CEO form
    this.ceoForm.patchValue({
      ceoSignature: this.employee.ceoSignature
    });
  }

  private updateWorkflowSteps() {
    if (!this.employee) return;

    this.workflowSteps.forEach(step => {
      step.isActive = step.id === this.employee!.currentStep;
      
      switch (step.id) {
        case 'HR':
          step.isCompleted = !!this.employee!.hrCompletedAt;
          break;
        case 'DepartmentHead':
          step.isCompleted = !!this.employee!.departmentCompletedAt;
          break;
        case 'IT':
          step.isCompleted = !!this.employee!.itCompletedAt;
          break;
        case 'CEO':
          step.isCompleted = !!this.employee!.ceoCompletedAt;
          break;
      }
    });
  }

  private async checkEditPermissions() {
    if (!this.employeeId || !this.currentStep) return;
    
    try {
      this.canEditCurrentStep = await this.employeeService.canEditStep(this.employeeId, this.currentStep).toPromise() || false;
      this.isFormReadonly = !this.canEditCurrentStep;
    } catch (error) {
      this.canEditCurrentStep = false;
      this.isFormReadonly = true;
    }
  }

  private async refreshCurrentView() {
    // Refresh the statistics
    await this.loadWorkflowStatistics();
    
    // If we're looking at a specific employee, reload it
    if (this.employeeId) {
      await this.loadEmployee(this.employeeId);
    }
    
    // Refresh the employees list for current step
    await this.loadEmployeesByStep(this.selectedStep);
  }

  // Event handlers
  onStepCardClick(step: WorkflowStep) {
    if (!step.isAuthorized) {
      this.toastr.showWarning(`You are not authorized to view the ${step.title} step`);
      return;
    }
    
    this.selectedStep = step.id;
    this.loadEmployeesByStep(step.id);
    this.employeeId = null;
    this.employee = null;
  }

  onEmployeeClick(employee: EmployeeResponse) {
    this.employeeId = employee.id;
    this.router.navigate(['/employees/form', employee.id]);
    this.loadEmployee(employee.id);
  }

  onNewEmployeeClick() {
    if (!this.currentUserRoles.includes('HR')) {
      this.toastr.showWarning('Only HR can create new employees');
      return;
    }
    
    this.employeeId = null;
    this.employee = null;
    this.currentStep = 'HR';
    this.selectedStep = 'HR';
    this.employeesList = [];
    this.initializeForms();
    this.router.navigate(['/employees/form']);
  }
 get canCreateNewEmployee(): boolean {
    return this.currentUserRoles.includes('HR');
  }
  get currentUserDisplayInfo(): string {
    if (this.currentUserRoles.length > 1) {
      const roles = this.currentUserRoles.join(' & ');
      return this.currentUserDepartmentName ? 
        `${roles} (${this.currentUserDepartmentName})` : 
        roles;
    }
    
    return this.currentUserDepartmentName ? 
      `${this.currentUserRole} (${this.currentUserDepartmentName})` : 
      this.currentUserRole;
  }
   canEditEmployeeStep(employee: EmployeeResponse, step: string): boolean {
    // Basic role check
    if (!this.isAuthorizedForStep(step)) {
      return false;
    }
    
    // Additional checks for department heads
    if (step === 'DepartmentHead' && this.currentUserRoles.includes('DepartmentHead')) {
      // HR, IT, and CEO heads can edit any employee in their step
      if (this.currentUserRoles.includes('HR') || 
          this.currentUserRoles.includes('IT') || 
          this.currentUserRoles.includes('CEO')) {
        return true;
      }
      
      // Other department heads can only edit employees from their department
      return employee.departmentId === this.currentUserDepartmentId;
    }
    
    return true;
  }
  onCancelClick() {
    // Navigate back to the progress table of the current user's section
    const currentUserStep = this.getDefaultStep();
    this.router.navigate(['/employees/form', { step: currentUserStep }]);
    this.selectedStep = currentUserStep;
    this.employeeId = null;
    this.employee = null;
    this.loadEmployeesByStep(currentUserStep);
  }

  get isMedicalEmployee(): boolean {
    return this.hrForm.get('isMedical')?.value || false;
  }

  // Form submission methods with auto-refresh
  async onSaveHR() {
    if (this.hrForm.invalid) {
      this.markFormGroupTouched(this.hrForm);
      return;
    }

    try {
      this.isLoading = true;
      const request: EmployeeHRRequest = this.hrForm.value;
      
      if (this.employeeId) {
        // Update existing employee
        this.toastr.showInfo('HR step update not implemented in this version');
      } else {
        // Create new employee
        const result = await this.employeeService.createEmployee(request).toPromise();
        this.employee = result || null;
        this.employeeId = this.employee?.id || null;
        this.toastr.showSuccess('Employee created successfully');
        
        if (this.employeeId) {
          this.router.navigate(['/employees/form', this.employeeId]);
        }
      }
      
      // Refresh the view
      await this.refreshCurrentView();
    } catch (error) {
      this.toastr.showError('Failed to save HR information');
    } finally {
      this.isLoading = false;
    }
  }

  async onCompleteHR() {
    if (!this.employeeId) return;
    
    try {
      this.isLoading = true;
      const result = await this.employeeService.completeHRStep(this.employeeId).toPromise();
      this.employee = result || null;
      this.currentStep = this.employee?.currentStep || 'HR';
      this.updateWorkflowSteps();
      await this.checkEditPermissions();
      this.toastr.showSuccess('HR step completed successfully');
      
      // Auto-navigate back to HR progress table
      setTimeout(() => {
        this.router.navigate(['/employees/form', { step: 'HR' }]);
        this.selectedStep = 'HR';
        this.employeeId = null;
        this.employee = null;
        this.loadEmployeesByStep('HR');
      }, 1500); // Give user time to see success message
      
    } catch (error) {
      this.toastr.showError('Failed to complete HR step');
    } finally {
      this.isLoading = false;
    }
  }

  async onSaveDepartment() {
    if (this.departmentForm.invalid || !this.employeeId) {
      this.markFormGroupTouched(this.departmentForm);
      return;
    }

    try {
      this.isLoading = true;
      const request: EmployeeDepartmentHeadRequest = {
        employeeId: this.employeeId,
        ...this.departmentForm.value
      };
      
      const result = await this.employeeService.updateDepartmentInfo(request).toPromise();
      this.employee = result || null;
      this.toastr.showSuccess('Department information saved successfully');
      
      // Refresh the view
      await this.refreshCurrentView();
    } catch (error) {
      this.toastr.showError('Failed to save department information');
    } finally {
      this.isLoading = false;
    }
  }

  async onCompleteDepartment() {
    if (!this.employeeId) return;
    
    try {
      this.isLoading = true;
      const result = await this.employeeService.completeDepartmentStep(this.employeeId).toPromise();
      this.employee = result || null;
      this.currentStep = this.employee?.currentStep || 'HR';
      this.updateWorkflowSteps();
      await this.checkEditPermissions();
      this.toastr.showSuccess('Department step completed successfully');
      
      // Auto-navigate back to Department progress table
      setTimeout(() => {
        this.router.navigate(['/employees/form', { step: 'DepartmentHead' }]);
        this.selectedStep = 'DepartmentHead';
        this.employeeId = null;
        this.employee = null;
        this.loadEmployeesByStep('DepartmentHead');
      }, 1500);
      
    } catch (error) {
      this.toastr.showError('Failed to complete department step');
    } finally {
      this.isLoading = false;
    }
  }

  async onSaveIT() {
    if (this.itForm.invalid || !this.employeeId) {
      this.markFormGroupTouched(this.itForm);
      return;
    }

    try {
      this.isLoading = true;
      const request: EmployeeITRequest = {
        employeeId: this.employeeId,
        ...this.itForm.value
      };
      
      const result = await this.employeeService.updateITInfo(request).toPromise();
      this.employee = result || null;
      this.toastr.showSuccess('IT information saved successfully');
      
      // Refresh the view
      await this.refreshCurrentView();
    } catch (error) {
      this.toastr.showError('Failed to save IT information');
    } finally {
      this.isLoading = false;
    }
  }

  async onCompleteIT() {
    if (!this.employeeId) return;
    
    try {
      this.isLoading = true;
      const result = await this.employeeService.completeITStep(this.employeeId).toPromise();
      this.employee = result || null;
      this.currentStep = this.employee?.currentStep || 'HR';
      this.updateWorkflowSteps();
      await this.checkEditPermissions();
      this.toastr.showSuccess('IT step completed successfully');
      
      // Auto-navigate back to IT progress table
      setTimeout(() => {
        this.router.navigate(['/employees/form', { step: 'IT' }]);
        this.selectedStep = 'IT';
        this.employeeId = null;
        this.employee = null;
        this.loadEmployeesByStep('IT');
      }, 1500);
      
    } catch (error) {
      this.toastr.showError('Failed to complete IT step');
    } finally {
      this.isLoading = false;
    }
  }

  async onSaveCEO() {
    if (!this.employeeId) return;

    try {
      this.isLoading = true;
      const request: EmployeeCEORequest = {
        employeeId: this.employeeId,
        ...this.ceoForm.value
      };
      
      const result = await this.employeeService.updateCEOInfo(request).toPromise();
      this.employee = result || null;
      this.toastr.showSuccess('CEO signature saved successfully');
      
      // Refresh the view
      await this.refreshCurrentView();
    } catch (error) {
      this.toastr.showError('Failed to save CEO signature');
    } finally {
      this.isLoading = false;
    }
  }

  async onCompleteCEO() {
    if (!this.employeeId) return;
    
    try {
      this.isLoading = true;
      const result = await this.employeeService.completeCEOStep(this.employeeId).toPromise();
      this.employee = result || null;
      this.currentStep = this.employee?.currentStep || 'HR';
      this.updateWorkflowSteps();
      await this.checkEditPermissions();
      this.toastr.showSuccess('Employee registration completed successfully!');
      
      // Auto-navigate back to CEO progress table
      setTimeout(() => {
        this.router.navigate(['/employees/form', { step: 'CEO' }]);
        this.selectedStep = 'CEO';
        this.employeeId = null;
        this.employee = null;
        this.loadEmployeesByStep('CEO');
      }, 1500);
      
    } catch (error) {
      this.toastr.showError('Failed to complete CEO approval');
    } finally {
      this.isLoading = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Valid email is required';
      if (field.errors['maxlength']) return `${fieldName} is too long`;
      if (field.errors['min']) return `${fieldName} must be selected`;
    }
    return '';
  }

  canShowStep(stepId: string): boolean {
    if (!this.employee) return stepId === 'HR';
    
    switch (stepId) {
      case 'HR':
        return true;
      case 'DepartmentHead':
        return !!this.employee.hrCompletedAt;
      case 'IT':
        return !!this.employee.departmentCompletedAt;
      case 'CEO':
        return !!this.employee.itCompletedAt;
      default:
        return false;
    }
  }
}