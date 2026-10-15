import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectOverlayComponent } from './project-overlay.component';

describe('ProjectOverlayComponent', () => {
  let component: ProjectOverlayComponent;
  let fixture: ComponentFixture<ProjectOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
