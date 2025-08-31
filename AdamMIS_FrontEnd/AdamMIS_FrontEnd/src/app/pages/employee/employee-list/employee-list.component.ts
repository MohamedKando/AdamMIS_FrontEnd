// employee-list.component.ts - FIXED VERSION
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { EmployeeService, EmployeeResponse } from '../../../services/employee.service';
import { NotificationService } from '../../../Notfications/notification.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit {
  employees: EmployeeResponse[] = [];
  filteredEmployees: EmployeeResponse[] = [];
  isLoading = false;
  searchTerm = '';
  selectedStatus = 'All';
  selectedDepartment = 'All';
  departments: any[] = [];

  statusOptions = [
    { value: 'All', label: 'All Status' },
    { value: 'Draft', label: 'Draft' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'Approved', label: 'Approved' }
  ];

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
    private toastr: NotificationService
  ) {
    console.log('EmployeeListComponent constructor called');
  }

  ngOnInit() {
    console.log('EmployeeListComponent ngOnInit called');
    this.loadEmployees();
    this.loadDepartments();
  }

  private async loadEmployees() {
    console.log('Loading employees...');
    try {
      this.isLoading = true;
      
      this.employeeService.getAllEmployees().subscribe({
        next: (data) => {
          console.log('Employees loaded:', data);
          this.employees = data || [];
          this.filteredEmployees = [...this.employees];
          this.isLoading = false;
          
          // Debug: Log the first employee to check data structure
          if (this.employees.length > 0) {
            console.log('First employee data:', this.employees[0]);
            console.log('Current Step:', this.employees[0].currentStep);
            console.log('Status:', this.employees[0].status);
          }
        },
        error: (error) => {
          console.error('Error loading employees:', error);
          this.toastr.showError('Failed to load employees');
          this.isLoading = false;
          this.employees = [];
          this.filteredEmployees = [];
        }
      });
      
    } catch (error) {
      console.error('Exception in loadEmployees:', error);
      this.isLoading = false;
    }
  }

  private async loadDepartments() {
    console.log('Loading departments...');
    try {
      this.employeeService.getAllDepartments().subscribe({
        next: (data) => {
          console.log('Departments loaded:', data);
          this.departments = data || [];
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          this.departments = [];
        }
      });
    } catch (error) {
      console.error('Exception in loadDepartments:', error);
      this.departments = [];
    }
  }

  onSearch() {
    this.applyFilters();
  }

  onStatusFilterChange() {
    this.applyFilters();
  }

  onDepartmentFilterChange() {
    this.applyFilters();
  }

  private applyFilters() {
    this.filteredEmployees = this.employees.filter(emp => {
      const matchesSearch = !this.searchTerm || 
        emp.nameEnglish?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        emp.nameArabic?.includes(this.searchTerm) ||
        emp.employeeNumber?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = this.selectedStatus === 'All' || emp.status === this.selectedStatus;
      
      const matchesDepartment = this.selectedDepartment === 'All' || 
        emp.departmentId?.toString() === this.selectedDepartment;
      
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }

  onNewEmployee() {
    this.router.navigate(['/employees/form']);
  }

  onEditEmployee(employee: EmployeeResponse) {
    this.router.navigate(['/employees/form', employee.id]);
  }

  onViewEmployee(employee: EmployeeResponse) {
    this.router.navigate(['/employees/form', employee.id, employee.currentStep]);
  }

  getStatusBadgeClass(status: string): string {
    if (!status) return 'badge-secondary';
    
    switch (status.toLowerCase()) {
      case 'draft': return 'badge-secondary';
      case 'inprogress': 
      case 'in progress': 
      case 'in-progress': return 'badge-warning';
      case 'approved': return 'badge-success';
      case 'pending': return 'badge-info';
      case 'rejected': return 'badge-danger';
      default: return 'badge-secondary';
    }
  }

  getCurrentStepDisplay(step: string): string {
    if (!step) return 'Not Started';
    
    // Handle both cases and potential variations
    switch (step.toLowerCase()) {
      case 'hr': 
      case 'hrinfo':
      case 'hr_info': return 'HR Information';
      case 'departmenthead': 
      case 'department_head':
      case 'department-head':
      case 'depthead': return 'Department Head';
      case 'it': 
      case 'itinfo':
      case 'it_info': return 'IT Information';
      case 'ceo': 
      case 'ceoapproval':
      case 'ceo_approval': return 'CEO Approval';
      case 'completed': return 'Completed';
      case 'pending': return 'Pending';
      default: 
        // Return formatted version of the step name
        return step.charAt(0).toUpperCase() + step.slice(1).replace(/([A-Z])/g, ' $1').trim();
    }
  }

  // Helper method to safely get status display
  getStatusDisplay(status: string): string {
    if (!status) return 'Unknown';
    
    switch (status.toLowerCase()) {
      case 'inprogress': return 'In Progress';
      case 'in-progress': return 'In Progress';
      default: return status;
    }
  }

  // Helper method for debugging - you can remove this later
  debugEmployee(employee: EmployeeResponse) {
    console.log('Employee Debug Info:', {
      id: employee.id,
      name: employee.nameEnglish,
      currentStep: employee.currentStep,
      status: employee.status,
      fullEmployee: employee
    });
  }
}