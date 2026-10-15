import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';

@Component({
  selector: 'app-how-i-work',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './how-i-work.component.html',
  styleUrl: './how-i-work.component.scss'
})
export class HowIWorkComponent {
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
}
