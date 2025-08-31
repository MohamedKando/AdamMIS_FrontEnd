import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateTicket {
  title: string;
  description: string;
  priority: number;
  urgency: number;
  type: number;
  assignedToName?: string;
  timeToResolve?: number;
}

export interface TicketResponse {
  id: number;
  name: string;
  content: string;
  status: number;
  priority: number;
  urgency: number;
  users_Id_Recipient: number;
  users_Id_Lastupdater: number;
  time_To_Resolve?: string;
  date_Creation: string;
  closedate?: string;
  solvedate?: string;
  statusText: string;
  priorityText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private LocalapiUrl = 'https://localhost:7209/api/Tickets'; // Adjust based on your API base URL
  private apiUrl = 'http://192.168.1.203:8080/api/Tickets';
  
  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  // Get all tickets
  getAllTickets(): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(this.apiUrl);
  }

  // Get single ticket by ID
  getTicket(id: number): Observable<TicketResponse> {
    return this.http.get<TicketResponse>(`${this.apiUrl}/${id}`);
  }

  // Create new ticket
  createTicket(ticket: CreateTicket): Observable<TicketResponse> {
    return this.http.post<TicketResponse>(`${this.apiUrl}/create`, ticket, {
      headers: this.getHeaders()
    });
  }

  // Solve ticket
  solveTicket(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/solve`, {}, {
      headers: this.getHeaders()
    });
  }

  // Close ticket
  closeTicket(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/close`, {}, {
      headers: this.getHeaders()
    });
  }

  // Helper methods for dropdown options
  getPriorityOptions() {
    return [
      { value: 1, label: 'Very Low' },
      { value: 2, label: 'Low' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'High' },
      { value: 5, label: 'Very High' }
    ];
  }

  getUrgencyOptions() {
    return [
      { value: 1, label: 'Very Low' },
      { value: 2, label: 'Low' },
      { value: 3, label: 'Medium' },
      { value: 4, label: 'High' },
      { value: 5, label: 'Very High' }
    ];
  }

  getTypeOptions() {
    return [
      { value: 1, label: 'Incident' },
      { value: 2, label: 'Request' }
    ];
  }

  // Helper method to get status color
  getStatusColor(status: number): string {
    switch (status) {
      case 1: return '#6c757d'; // New - Gray
      case 2: return '#007bff'; // Processing (assigned) - Blue
      case 3: return '#17a2b8'; // Processing (planned) - Info
      case 4: return '#ffc107'; // Pending - Warning
      case 5: return '#28a745'; // Solved - Success
      case 6: return '#dc3545'; // Closed - Danger
      default: return '#6c757d';
    }
  }

  // Helper method to get priority color
  getPriorityColor(priority: number): string {
    switch (priority) {
      case 1: return '#6c757d'; // Very Low - Gray
      case 2: return '#17a2b8'; // Low - Info
      case 3: return '#ffc107'; // Medium - Warning
      case 4: return '#fd7e14'; // High - Orange
      case 5: return '#dc3545'; // Very High - Danger
      default: return '#6c757d';
    }
  }
}