import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminLogsComponent } from './superadmin-logs.component';

describe('SuperadminLogsComponent', () => {
  let component: SuperadminLogsComponent;
  let fixture: ComponentFixture<SuperadminLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminLogsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
