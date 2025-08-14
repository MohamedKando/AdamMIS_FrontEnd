import { Component, OnInit, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AdamMIS';
  private heartbeatSub?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.heartbeatSub = interval(60000).subscribe(() => { // every 60 seconds
        this.authService.heartbeat().subscribe({
          next: () => console.log('Heartbeat sent'),
          error: err => console.error('Heartbeat failed', err)
        });
      });
    }
  }

  ngOnDestroy() {
    this.heartbeatSub?.unsubscribe();
  }
}
