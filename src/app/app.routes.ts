import { Routes } from '@angular/router';
import { MainPortfolioComponent } from './features/main-portfolio/main-portfolio.component';
import { YeniChaconComponent } from './features/yeni-chacon/yeni-chacon.component';

export const routes: Routes = [
  { path: '', component: MainPortfolioComponent },
  { path: 'yeni-chacon', component: YeniChaconComponent },
  { path: 'yeni', redirectTo: 'yeni-chacon', pathMatch: 'full' },
  { path: 'cv-yeni', redirectTo: 'yeni-chacon', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
