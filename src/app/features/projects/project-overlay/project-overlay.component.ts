import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { ProjectItem } from '../../../core/models/portfolio.model';

@Component({
  selector: 'app-project-overlay',
  standalone: true,
  templateUrl: './project-overlay.component.html',
  styleUrl: './project-overlay.component.scss'
})
export class ProjectOverlayComponent {
  @Input() project: ProjectItem | null = null;
  @Input() overlayLabels: any = {};
  @Output() closeOverlay = new EventEmitter<void>();

  close() {
    this.closeOverlay.emit();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    this.close();
  }
}
