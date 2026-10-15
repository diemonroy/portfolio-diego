import { Component, HostListener, inject, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';
import { QrShareService, QrTabType } from '../../core/services/qr-share.service';
import { LanguageSwitcherComponent } from '../../shared/language-switcher/language-switcher.component';
import { TiltDirective } from '../../shared/directives/tilt.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [AsyncPipe, LanguageSwitcherComponent, TiltDirective],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private portfolioDataService = inject(PortfolioDataService);
  private qrShareService = inject(QrShareService);
  portfolioData$ = this.portfolioDataService.portfolioData$;
  
  isScrolled = signal(false);
  mobileMenuActive = signal(false);
  activeSection = signal('hero');

  openQrModal(tab: QrTabType = 'portfolio') {
    this.qrShareService.open(tab);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 50);
    this.updateActiveSection();
  }

  toggleMobileMenu() {
    this.mobileMenuActive.update(val => !val);
  }

  closeMobileMenu() {
    this.mobileMenuActive.set(false);
  }

  private updateActiveSection() {
    // Simple logic to mimic original active section update based on intersection
    const sections = ['hero', 'proyectos', 'sobre', 'proceso'];
    let current = this.activeSection();
    
    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const rect = element.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4 && rect.bottom >= window.innerHeight * 0.4) {
          current = section;
        }
      }
    }
    if (current !== this.activeSection()) {
      this.activeSection.set(current);
    }
  }
}
