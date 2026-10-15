import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { PortfolioData, ProjectItem } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioDataService {
  private http = inject(HttpClient);
  
  private currentLangSubject = new BehaviorSubject<'es' | 'en'>('es');
  public currentLang$ = this.currentLangSubject.asObservable();
  
  private portfolioDataSubject = new BehaviorSubject<PortfolioData | null>(null);
  public portfolioData$ = this.portfolioDataSubject.asObservable();

  readonly activeProjectModal = signal<ProjectItem | null>(null);

  constructor() {
    const savedLang = localStorage.getItem('lang') as 'es' | 'en';
    const browserLang = typeof navigator !== 'undefined' ? (navigator.language.split('-')[0] as 'es' | 'en') : 'es';
    const initialLang = savedLang || (browserLang === 'en' ? 'en' : 'es');
    this.setLanguage(initialLang);
  }

  setLanguage(lang: 'es' | 'en') {
    this.currentLangSubject.next(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('lang', lang);
    }
    this.loadData(lang).subscribe();
  }

  getCurrentLanguage(): 'es' | 'en' {
    return this.currentLangSubject.value;
  }

  openProjectById(projectId: string): void {
    const data = this.portfolioDataSubject.value;
    if (data && data.projects) {
      const proj = data.projects.find(p => p.id === projectId);
      if (proj) {
        this.activeProjectModal.set(proj);
        if (typeof document !== 'undefined') {
          document.body.style.overflow = 'hidden';
        }
      }
    }
  }

  closeProjectModal(): void {
    this.activeProjectModal.set(null);
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  private loadData(lang: 'es' | 'en'): Observable<PortfolioData> {
    return this.http.get<PortfolioData>(`data/${lang}.json`).pipe(
      tap(data => this.portfolioDataSubject.next(data))
    );
  }
}
