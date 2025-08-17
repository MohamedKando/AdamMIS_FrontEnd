import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetabaseComponent } from './metabase.component';

describe('MetabaseComponent', () => {
  let component: MetabaseComponent;
  let fixture: ComponentFixture<MetabaseComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MetabaseComponent]
    });
    fixture = TestBed.createComponent(MetabaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
