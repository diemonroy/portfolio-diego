import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { HomeComponent } from './features/home/home.component';
import { ProjectsComponent } from './features/projects/projects.component';
import { AboutComponent } from './features/about/about.component';
import { HowIWorkComponent } from './features/how-i-work/how-i-work.component';
import { PortfolioDataService } from './core/services/portfolio-data.service';

import { AsyncPipe } from '@angular/common';
import { QrModalComponent } from './shared/components/qr-modal/qr-modal.component';
import { AiChatDrawerComponent } from './shared/components/ai-chat-drawer/ai-chat-drawer.component';
import { AiDashboardModalComponent } from './shared/components/ai-dashboard-modal/ai-dashboard-modal.component';
import { AiDashboardService } from './core/services/ai-dashboard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AsyncPipe,
    RouterOutlet,
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
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'portfolio-app';
  private portfolioDataService = inject(PortfolioDataService);
  private dashboardService = inject(AiDashboardService);
  portfolioData$ = this.portfolioDataService.portfolioData$;

  ngOnInit() {
    if (typeof window !== 'undefined') {
      // Abrir tablero directamente si la URL incluye #dashboard o ?dashboard
      const checkAndOpenDashboard = () => {
        if (window.location.hash === '#dashboard' || window.location.search.includes('dashboard')) {
          this.dashboardService.openDashboard();
        }
      };

      setTimeout(checkAndOpenDashboard, 200);
      window.addEventListener('hashchange', checkAndOpenDashboard);

      // Atajo de teclado global: Cmd + Shift + D (Mac) o Ctrl + Shift + D (Windows/Linux)
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
          e.preventDefault();
          this.dashboardService.toggleDashboard();
        }
      });
    }
  }
}
