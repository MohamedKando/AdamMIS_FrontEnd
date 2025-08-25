import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService, CreateTicket, TicketResponse } from '../../services/ticket.service';

@Component({
  selector: 'app-tickets-glpi',
  templateUrl: './tickets-glpi.component.html',
  styleUrls: ['./tickets-glpi.component.css']
})
export class TicketsGlpiComponent implements OnInit {
  createTicketForm: FormGroup;
  
  // UI State
  isCreatingTicket = false;
  showCreateForm = true; // Always show by default since it's the main feature
  showSuccessMessage = false;
  createdTicketId: number | null = null;

  // Options for dropdowns
  priorityOptions = this.ticketService.getPriorityOptions();
  urgencyOptions = this.ticketService.getUrgencyOptions();
  typeOptions = this.ticketService.getTypeOptions();

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService
  ) {
    this.createTicketForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      priority: [3, Validators.required],
      urgency: [3, Validators.required],
      type: [1, Validators.required],
      assignedToName: [''],
      timeToResolve: ['']
    });
  }

  ngOnInit(): void {
    // Component initialization
  }

  // Create new ticket
  onCreateTicket(): void {
    if (this.createTicketForm.valid) {
      this.isCreatingTicket = true;
      this.showSuccessMessage = false;
      const ticketData: CreateTicket = this.createTicketForm.value;

      this.ticketService.createTicket(ticketData).subscribe({
        next: (response) => {
          console.log('Ticket created successfully:', response);
          this.createdTicketId = response.id;
          this.showSuccessMessage = true;
          this.resetForm();
          this.isCreatingTicket = false;
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            this.showSuccessMessage = false;
            this.createdTicketId = null;
          }, 5000);
        },
        error: (error) => {
          console.error('Error creating ticket:', error);
          this.isCreatingTicket = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  // Reset form to default values
  resetForm(): void {
    this.createTicketForm.reset();
    this.createTicketForm.patchValue({
      priority: 3,
      urgency: 3,
      type: 1
    });
  }

  // Mark all form fields as touched to show validation errors
  markFormGroupTouched(): void {
    Object.keys(this.createTicketForm.controls).forEach(field => {
      const control = this.createTicketForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Get form field error message
  getFieldError(fieldName: string): string {
    const field = this.createTicketForm.get(fieldName);
    if (field?.hasError('required')) {
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
    }
    if (field?.hasError('minlength')) {
      const requiredLength = field.errors?.['minlength']?.requiredLength;
      return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${requiredLength} characters`;
    }
    return '';
  }

  // Check if field has error
  isFieldInvalid(fieldName: string): boolean {
    const field = this.createTicketForm.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }
}
