import { Component, OnInit, OnDestroy } from '@angular/core';
import { HeartbeatService } from './services/heartbeat.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'AdamMIS';

  constructor(private heartbeatService: HeartbeatService) {}

  ngOnInit() {
    this.heartbeatService.startHeartbeat();
  }

  ngOnDestroy() {
    this.heartbeatService.stopHeartbeat();
  }
}