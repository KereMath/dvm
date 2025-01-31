import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuperadminDocumentsComponent } from './superadmin-documents.component';

describe('SuperadminDocumentsComponent', () => {
  let component: SuperadminDocumentsComponent;
  let fixture: ComponentFixture<SuperadminDocumentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperadminDocumentsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuperadminDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
