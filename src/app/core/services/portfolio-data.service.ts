import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { PortfolioData } from '../models/portfolio.model';

@Injectable({
  providedIn: 'root'
})
export class PortfolioDataService {
  private http = inject(HttpClient);
  
  private currentLangSubject = new BehaviorSubject<'es' | 'en'>('es');
  public currentLang$ = this.currentLangSubject.asObservable();
  
  private portfolioDataSubject = new BehaviorSubject<PortfolioData | null>(null);
  public portfolioData$ = this.portfolioDataSubject.asObservable();

  constructor() {
    const savedLang = localStorage.getItem('lang') as 'es' | 'en';
    const browserLang = navigator.language.split('-')[0] as 'es' | 'en';
    const initialLang = savedLang || (browserLang === 'en' ? 'en' : 'es');
    this.setLanguage(initialLang);
  }

  setLanguage(lang: 'es' | 'en') {
    this.currentLangSubject.next(lang);
    localStorage.setItem('lang', lang);
    this.loadData(lang).subscribe();
  }

  getCurrentLanguage(): 'es' | 'en' {
    return this.currentLangSubject.value;
  }

  private loadData(lang: 'es' | 'en'): Observable<PortfolioData> {
    return this.http.get<PortfolioData>(`data/${lang}.json`).pipe(
      tap(data => this.portfolioDataSubject.next(data))
    );
  }
}
