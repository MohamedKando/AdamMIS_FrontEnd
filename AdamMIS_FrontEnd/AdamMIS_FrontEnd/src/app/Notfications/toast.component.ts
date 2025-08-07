// toast.component.ts - FIXED VERSION
import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { NotificationService, Toast } from './notification.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts; let i = index" 
        class="toast toast-{{toast.type}}"
        [@slideIn]>
        <div class="toast-content">
          <span class="toast-icon">
            <ng-container [ngSwitch]="toast.type">
              <span *ngSwitchCase="'success'">✓</span>
              <span *ngSwitchCase="'error'">✕</span>
              <span *ngSwitchCase="'info'">ℹ</span>
              <span *ngSwitchCase="'warning'">⚠</span>
            </ng-container>
          </span>
          <span class="toast-message">{{toast.message}}</span>
          <button class="toast-close" (click)="removeToast(toast.id)">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 99999;
      max-width: 400px;
      pointer-events: none;
    }

    .toast {
      pointer-events: auto;
      margin-bottom: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      min-width: 300px;
    }

    .toast-success {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }

    .toast-error {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
    }

    .toast-info {
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
    }

    .toast-warning {
      background: linear-gradient(135deg, #FF9800, #F57C00);
      color: white;
    }

    .toast-content {
      display: flex;
      align-items: center;
      padding: 12px 16px;
    }

    .toast-icon {
      font-size: 18px;
      margin-right: 12px;
      font-weight: bold;
    }

    .toast-message {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-left: 12px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.8;
      transition: opacity 0.2s;
    }

    .toast-close:hover {
      opacity: 1;
    }
  `],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-in-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in-out', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {
    console.log('🚀 ToastComponent constructed');
  }

  ngOnInit() {
    console.log('🚀 ToastComponent initialized');
    this.subscription = this.notificationService.toasts$.subscribe(
      toasts => {
        console.log('📱 Received toasts in component:', toasts);
        console.log('📱 Toasts array length:', toasts.length);
        this.toasts = toasts;
      }
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  removeToast(id: string) {
    this.notificationService.removeToast(id);
  }
}