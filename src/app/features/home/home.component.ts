import { Component, OnInit, OnDestroy, inject, signal, HostListener } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';
import { QrShareService, QrTabType } from '../../core/services/qr-share.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TiltDirective } from '../../shared/directives/tilt.directive';
import { ArchitectureSceneComponent } from './architecture-scene/architecture-scene.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [AsyncPipe, TiltDirective, ArchitectureSceneComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  private portfolioDataService = inject(PortfolioDataService);
  private qrShareService = inject(QrShareService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
  
  currentWordIndex = signal(0);
  cvMenuOpen = signal(false);
  private intervalId: any;

  openQrModal(tab: QrTabType = 'portfolio') {
    this.qrShareService.open(tab);
  }

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

  toggleCvMenu(event: MouseEvent) {
    event.stopPropagation();
    this.cvMenuOpen.update(open => !open);
  }

  closeCvMenu() {
    this.cvMenuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick() {
    if (this.cvMenuOpen()) {
      this.closeCvMenu();
    }
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
