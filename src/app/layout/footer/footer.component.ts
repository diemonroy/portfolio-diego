import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
  readonly currentYear = new Date().getFullYear();
}
