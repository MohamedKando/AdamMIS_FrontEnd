// heartbeat.service.ts
import { Injectable } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class HeartbeatService {
  private heartbeatSub?: Subscription;

  constructor(private authService: AuthService) {}

  startHeartbeat() {
    if (this.heartbeatSub) {
      return; // Already running
    }

    if (this.authService.isLoggedIn()) {
      console.log('Starting heartbeat service');
      this.heartbeatSub = interval(60000).subscribe(() => {
        this.authService.heartbeat().subscribe({
          next: () => console.log('Heartbeat sent'),
          error: err => console.error('Heartbeat failed', err)
        });
      });
    }
  }

  stopHeartbeat() {
    if (this.heartbeatSub) {
      this.heartbeatSub.unsubscribe();
      this.heartbeatSub = undefined;
      console.log('Heartbeat service stopped');
    }
  }
}