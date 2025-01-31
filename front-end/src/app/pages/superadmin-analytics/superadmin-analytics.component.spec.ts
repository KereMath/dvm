import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminAnalyticsComponent } from './superadmin-analytics.component';

describe('SuperadminAnalyticsComponent', () => {
  let component: SuperadminAnalyticsComponent;
  let fixture: ComponentFixture<SuperadminAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
