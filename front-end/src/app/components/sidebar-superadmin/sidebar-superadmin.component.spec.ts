import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarSuperadminComponent } from './sidebar-superadmin.component';

describe('SidebarSuperadminComponent', () => {
  let component: SidebarSuperadminComponent;
  let fixture: ComponentFixture<SidebarSuperadminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarSuperadminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarSuperadminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
