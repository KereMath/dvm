import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminUsersComponent } from './superadmin-users.component';

describe('SuperadminUsersComponent', () => {
  let component: SuperadminUsersComponent;
  let fixture: ComponentFixture<SuperadminUsersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminUsersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
