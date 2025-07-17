import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DmsReportComponent } from './dms-report.component';

describe('DmsReportComponent', () => {
  let component: DmsReportComponent;
  let fixture: ComponentFixture<DmsReportComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DmsReportComponent]
    });
    fixture = TestBed.createComponent(DmsReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
