import { Component, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
  
  activeTab = signal<'experience' | 'education' | 'skills' | 'tools'>('experience');

  setTab(tab: 'experience' | 'education' | 'skills' | 'tools') {
    this.activeTab.set(tab);
  }
}
