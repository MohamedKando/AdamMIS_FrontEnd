import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportViewingComponent } from './report-viewing.component';

describe('ReportViewingComponent', () => {
  let component: ReportViewingComponent;
  let fixture: ComponentFixture<ReportViewingComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReportViewingComponent]
    });
    fixture = TestBed.createComponent(ReportViewingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
