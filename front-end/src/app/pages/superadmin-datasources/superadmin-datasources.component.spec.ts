import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminDatasourcesComponent } from './superadmin-datasources.component';

describe('SuperadminDatasourcesComponent', () => {
  let component: SuperadminDatasourcesComponent;
  let fixture: ComponentFixture<SuperadminDatasourcesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminDatasourcesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminDatasourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
