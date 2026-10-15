import { Injectable, signal } from '@angular/core';

export type QrTabType = 'portfolio' | 'cv-design' | 'cv-ats' | 'vcard';

export interface QrItemConfig {
  id: QrTabType;
  label: string;
  badge: string;
  icon: string;
  description: string;
  getContentUrl: () => string;
}

@Injectable({
  providedIn: 'root'
})
export class QrShareService {
  isOpen = signal<boolean>(false);
  activeTab = signal<QrTabType>('portfolio');

  open(tab: QrTabType = 'portfolio') {
    this.activeTab.set(tab);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = '';
  }

  toggle(tab: QrTabType = 'portfolio') {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(tab);
    }
  }

  getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      // If deployed or localhost, use current origin
      return window.location.origin;
    }
    return 'https://diegomonroy.site';
  }

  getSharePayload(tab: QrTabType): { title: string; text: string; url: string; qrData: string } {
    const base = this.getBaseUrl();
    switch (tab) {
      case 'portfolio':
        return {
          title: 'Diego Monroy — Tech Lead & Solutions Architect',
          text: 'Conoce el portafolio y arquitectura de Diego Monroy:',
          url: base,
          qrData: base
        };
      case 'cv-design': {
        const url = `${base}/assets/CV_Diego_Monroy_Diseno.pdf`;
        return {
          title: 'CV Diseño Ejecutivo — Diego Monroy',
          text: 'Descarga el CV de diseño ejecutivo de Diego Monroy:',
          url,
          qrData: url
        };
      }
      case 'cv-ats': {
        const url = `${base}/assets/CV_Diego_Monroy_ATS.pdf`;
        return {
          title: 'CV Formato ATS — Diego Monroy',
          text: 'Descarga el CV optimizado para ATS de Diego Monroy:',
          url,
          qrData: url
        };
      }
      case 'vcard': {
        const vcard = [
          'BEGIN:VCARD',
          'VERSION:3.0',
          'N:Monroy Durán;Diego Leonardo;;;',
          'FN:Diego Leonardo Monroy Durán',
          'ORG:Banco de Bogotá',
          'TITLE:Tech Lead & Solutions Architect',
          'TEL;TYPE=CELL,VOICE;VALUE=uri:tel:+573108009394',
          'EMAIL:diego.97duran@gmail.com',
          `URL:${base}`,
          'URL;TYPE=LinkedIn:https://www.linkedin.com/in/diemonroy',
          'URL;TYPE=GitHub:https://github.com/diemonroy',
          'NOTE:Google Cloud Certified ACE | Tech Lead & Enterprise Architect',
          'END:VCARD'
        ].join('\n');
        return {
          title: 'Contacto — Diego Leonardo Monroy Durán',
          text: 'Tarjeta de contacto profesional de Diego Monroy',
          url: base,
          qrData: vcard
        };
      }
    }
  }
}
