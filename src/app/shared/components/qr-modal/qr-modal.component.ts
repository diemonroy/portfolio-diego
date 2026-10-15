import { Component, inject, computed, signal, HostListener, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { QrShareService, QrTabType } from '../../../core/services/qr-share.service';
import { QrCode, Ecc } from '../../../core/utils/qr-code';

@Component({
  selector: 'app-qr-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-modal.component.html',
  styleUrl: './qr-modal.component.scss'
})
export class QrModalComponent {
  qrService = inject(QrShareService);
  private sanitizer = inject(DomSanitizer);

  isOpen = this.qrService.isOpen;
  activeTab = this.qrService.activeTab;

  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  copied = signal<boolean>(false);
  canShareNative = signal<boolean>(false);

  tabs: { id: QrTabType; label: string; shortLabel: string; badge: string; icon: string }[] = [
    { id: 'portfolio', label: 'Portafolio Web', shortLabel: 'Portafolio', badge: 'Enlace', icon: 'globe' },
    { id: 'cv-ats', label: 'CV Formato ATS', shortLabel: 'CV ATS', badge: 'Optimizado', icon: 'zap' },
    { id: 'cv-design', label: 'CV Ejecutivo', shortLabel: 'CV Diseño', badge: 'Visual', icon: 'file' },
    { id: 'vcard', label: 'Guardar Contacto', shortLabel: 'Contacto', badge: 'vCard', icon: 'user' }
  ];

  currentPayload = computed(() => {
    return this.qrService.getSharePayload(this.activeTab());
  });

  qrSvgSafe = computed<SafeHtml>(() => {
    const payload = this.currentPayload();
    try {
      const qr = QrCode.encodeText(payload.qrData, Ecc.MEDIUM);
      const svgStr = qr.toSvgString(3, '#ffffff', '#0a0d14');
      return this.sanitizer.bypassSecurityTrustHtml(svgStr);
    } catch (e) {
      console.error('Error generating QR SVG:', e);
      return '';
    }
  });

  constructor() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      this.canShareNative.set(true);
    }

    // When modal opens or active tab changes, draw to hidden high-res canvas for PNG export
    effect(() => {
      if (this.isOpen()) {
        const payload = this.currentPayload();
        setTimeout(() => {
          this.renderCanvas(payload.qrData);
        }, 50);
      }
    });
  }

  setTab(tab: QrTabType) {
    this.qrService.activeTab.set(tab);
    this.copied.set(false);
  }

  close() {
    this.qrService.close();
    this.copied.set(false);
  }

  @HostListener('window:keydown.escape')
  onEscape() {
    if (this.isOpen()) {
      this.close();
    }
  }

  async copyLink() {
    const payload = this.currentPayload();
    try {
      await navigator.clipboard.writeText(payload.url);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    } catch {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = payload.url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2400);
    }
  }

  async shareNative() {
    const payload = this.currentPayload();
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url
        });
      } catch {
        // User cancelled share
      }
    } else {
      this.copyLink();
    }
  }

  downloadQrPng() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diego_Monroy_QR_${this.activeTab()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  downloadVCardFile() {
    const payload = this.qrService.getSharePayload('vcard');
    const blob = new Blob([payload.qrData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Diego_Monroy_Contacto.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private renderCanvas(data: string) {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    try {
      const qr = QrCode.encodeText(data, Ecc.MEDIUM);
      qr.drawToCanvas(canvas, 16, 4, '#ffffff', '#0a0d14');
    } catch (e) {
      console.error('Error drawing QR to canvas:', e);
    }
  }
}
