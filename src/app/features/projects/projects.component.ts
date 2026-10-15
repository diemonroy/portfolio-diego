import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';
import { ProjectOverlayComponent } from './project-overlay/project-overlay.component';
import { ProjectItem } from '../../core/models/portfolio.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [AsyncPipe, ProjectOverlayComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss'
})
export class ProjectsComponent {
  readonly portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;

  openProject(project: ProjectItem) {
    this.portfolioDataService.activeProjectModal.set(project);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  closeProject() {
    this.portfolioDataService.closeProjectModal();
  }
}
