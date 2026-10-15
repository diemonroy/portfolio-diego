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
    AiChatDrawerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'portfolio-app';
  private portfolioDataService = inject(PortfolioDataService);
  portfolioData$ = this.portfolioDataService.portfolioData$;

  ngOnInit() {
    // Initial data fetch happens automatically in the service, but we can subscribe if needed
    // or just let child components consume `portfolioData$` via async pipe.
  }
}
