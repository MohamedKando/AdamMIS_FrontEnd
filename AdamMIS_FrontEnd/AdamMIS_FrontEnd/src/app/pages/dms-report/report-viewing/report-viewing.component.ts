import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-report-viewing',
  templateUrl: './report-viewing.component.html',
  styleUrls: ['./report-viewing.component.css']
})
export class ReportViewingComponent {

  constructor(private router: Router) { }

  navigateToHome() {
    this.router.navigate(['/dashboard']);
  }
}