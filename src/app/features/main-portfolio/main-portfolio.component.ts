import { Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { NavbarComponent } from '../../layout/navbar/navbar.component';
import { FooterComponent } from '../../layout/footer/footer.component';
import { HomeComponent } from '../home/home.component';
import { ProjectsComponent } from '../projects/projects.component';
import { AboutComponent } from '../about/about.component';
import { HowIWorkComponent } from '../how-i-work/how-i-work.component';
import { PortfolioDataService } from '../../core/services/portfolio-data.service';
import { QrModalComponent } from '../../shared/components/qr-modal/qr-modal.component';
import { AiChatDrawerComponent } from '../../shared/components/ai-chat-drawer/ai-chat-drawer.component';
import { AiDashboardModalComponent } from '../../shared/components/ai-dashboard-modal/ai-dashboard-modal.component';
import { AiDashboardService } from '../../core/services/ai-dashboard.service';

@Component({
  selector: 'app-main-portfolio',
  standalone: true,
  imports: [
    AsyncPipe,
    NavbarComponent,
    HomeComponent,
    ProjectsComponent,
    AboutComponent,
    HowIWorkComponent,
    FooterComponent,
    QrModalComponent,
    AiChatDrawerComponent,
    AiDashboardModalComponent
  ],
  template: `
    <app-navbar></app-navbar>

    <main>
      <app-home></app-home>
      
      <app-projects></app-projects>
      
      @if (portfolioData$ | async; as data) {
      <section class="quote-section">
        <h2 class="quote-text">{{ data.quote }}</h2>
      </section>
      }

      <app-about></app-about>
      
      <app-how-i-work></app-how-i-work>
    </main>

    <app-footer></app-footer>
    <app-qr-modal></app-qr-modal>
    <app-ai-chat-drawer></app-ai-chat-drawer>
    <app-ai-dashboard-modal></app-ai-dashboard-modal>
  `
})
export class MainPortfolioComponent implements OnInit {
  private portfolioDataService = inject(PortfolioDataService);
  private dashboardService = inject(AiDashboardService);
  portfolioData$ = this.portfolioDataService.portfolioData$;

  ngOnInit() {
    if (typeof window !== 'undefined') {
      const checkAndOpenDashboard = () => {
        if (window.location.hash === '#dashboard' || window.location.search.includes('dashboard')) {
          this.dashboardService.openDashboard();
        }
      };

      setTimeout(checkAndOpenDashboard, 200);
      window.addEventListener('hashchange', checkAndOpenDashboard);

      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
          e.preventDefault();
          this.dashboardService.toggleDashboard();
        }
      });
    }
  }
}
