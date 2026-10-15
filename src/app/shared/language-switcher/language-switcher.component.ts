import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss'
})
export class LanguageSwitcherComponent {
  private portfolioDataService = inject(PortfolioDataService);
  
  // Expose an observable or just bind the current lang
  currentLang$ = this.portfolioDataService.currentLang$;

  switchLang(lang: 'es' | 'en') {
    this.portfolioDataService.setLanguage(lang);
  }
}
