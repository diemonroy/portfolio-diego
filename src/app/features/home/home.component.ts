import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, TiltDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
  
  currentWordIndex = signal(0);
  private intervalId: any;

  constructor() {
    this.portfolioDataService.currentLang$.pipe(
      takeUntilDestroyed()
    ).subscribe(() => {
      this.currentWordIndex.set(0);
    });
  }

  ngOnInit() {
    this.intervalId = setInterval(() => {
      const data = this.portfolioDataService.getCurrentLanguage();
      // the actual data size is 3 words, so we cycle 0, 1, 2
      this.currentWordIndex.update(idx => (idx + 1) % 3);
    }, 2700);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
