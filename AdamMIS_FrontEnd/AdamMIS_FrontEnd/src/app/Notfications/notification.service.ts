import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  showSuccess(message: string, duration: number = 3000) {
    console.log('Showing success toast:', message); // Debug log
    this.addToast({
      id: this.generateId(),
      message,
      type: 'success',
      duration
    });
  }

  showError(message: string, duration: number = 5000) {
    console.log('Showing error toast:', message); // Debug log
    this.addToast({
      id: this.generateId(),
      message,
      type: 'error',
      duration
    });
  }

  showInfo(message: string, duration: number = 3000) {
    console.log('Showing info toast:', message); // Debug log
    this.addToast({
      id: this.generateId(),
      message,
      type: 'info',
      duration
    });
  }

  showWarning(message: string, duration: number = 4000) {
    console.log('Showing warning toast:', message); // Debug log
    this.addToast({
      id: this.generateId(),
      message,
      type: 'warning',
      duration
    });
  }

  private addToast(toast: Toast) {
    const currentToasts = this.toastsSubject.value;
    const newToasts = [...currentToasts, toast];
    console.log('Adding toast. New toasts array:', newToasts); // Debug log
    this.toastsSubject.next(newToasts);

    // Auto remove after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.removeToast(toast.id);
      }, toast.duration);
    }
  }

  removeToast(id: string) {
    const currentToasts = this.toastsSubject.value;
    const filteredToasts = currentToasts.filter(toast => toast.id !== id);
    console.log('Removing toast. Remaining toasts:', filteredToasts); // Debug log
    this.toastsSubject.next(filteredToasts);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}