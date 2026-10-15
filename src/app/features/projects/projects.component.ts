import { Component, inject, signal } from '@angular/core';
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
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;

  selectedProject = signal<ProjectItem | null>(null);

  openProject(project: ProjectItem) {
    this.selectedProject.set(project);
    document.body.style.overflow = 'hidden';
  }

  closeProject() {
    this.selectedProject.set(null);
    document.body.style.overflow = '';
  }
}
