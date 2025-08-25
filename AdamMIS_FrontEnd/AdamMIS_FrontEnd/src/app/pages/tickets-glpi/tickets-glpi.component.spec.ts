import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsGlpiComponent } from './tickets-glpi.component';

describe('TicketsGlpiComponent', () => {
  let component: TicketsGlpiComponent;
  let fixture: ComponentFixture<TicketsGlpiComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [TicketsGlpiComponent]
    });
    fixture = TestBed.createComponent(TicketsGlpiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
