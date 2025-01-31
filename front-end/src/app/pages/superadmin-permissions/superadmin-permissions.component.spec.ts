import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminPermissionsComponent } from './superadmin-permissions.component';

describe('SuperadminPermissionsComponent', () => {
  let component: SuperadminPermissionsComponent;
  let fixture: ComponentFixture<SuperadminPermissionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminPermissionsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminPermissionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
