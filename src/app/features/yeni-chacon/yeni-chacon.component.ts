import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { QrCode, Ecc } from '../../core/utils/qr-code';

export type YeniQrTab = 'profile' | 'vcard' | 'whatsapp';

export interface WorkExperience {
  company: string;
  role: string;
  badge: string;
  period: string;
  location: string;
  description: string;
  achievements: string[];
  skills: string[];
  isHighlighted?: boolean;
}

export interface SkillCategory {
  title: string;
  icon: string;
  items: { name: string; level?: string; highlight?: boolean }[];
}

@Component({
  selector: 'app-yeni-chacon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './yeni-chacon.component.html',
  styleUrl: './yeni-chacon.component.scss'
})
export class YeniChaconComponent implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);
  private titleService = inject(Title);
  private originalTitle = '';

  // Estados interactivos
  isQrModalOpen = signal<boolean>(false);
  activeQrTab = signal<YeniQrTab>('profile');
  copiedLink = signal<boolean>(false);
  activeSection = signal<string>('profile');

  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  // Datos personales de contacto
  readonly personalInfo = {
    name: 'Yeni Andrea Chacón Gordillo',
    title: 'Abogada en Formación · Énfasis en Derecho Público & Administrativo',
    subtitle: '9.º Semestre de Derecho · Fundación Universidad Autónoma de Colombia',
    phone: '+57 310 541 3336',
    phoneClean: '573105413336',
    email: 'yeni0314@hotmail.com',
    location: 'Bogotá D.C., Colombia',
    address: 'Kr 50A # 33 - 38 Sur',
    linkedinUrl: 'https://linkedin.com/in/yenichacon',
    linkedinDisplay: 'linkedin.com/in/yenichacon',
    gradYear: '2026',
    statusBadge: 'Disponible para Vinculación Inmediata'
  };

  // Experiencia Laboral Detallada
  readonly experiences: WorkExperience[] = [
    {
      company: 'Secretaría Distrital de Hacienda',
      role: 'Pasante Jurídica · Gestión Documental & Constitucional',
      badge: 'Sector Público · Destacado',
      period: 'Noviembre 2025 – Febrero 2026',
      location: 'Bogotá D.C.',
      description: 'Apoyo jurídico sustantivo en la gestión de obligaciones tributarias distritales y atención prioritaria de garantías constitucionales.',
      achievements: [
        'Análisis exhaustivo de bases de datos para verificación de causales y procedencia jurídica de prescripción de obligaciones tributarias.',
        'Proyección fundamentada de respuestas a acciones de tutela y derechos de petición bajo estrictos estándares jurisprudenciales y términos de ley.',
        'Organización, depuración y foliación de expedientes digitales garantizando total trazabilidad y cadena de custodia documental institucional.',
        'Emisión de conceptos jurídicos previos y apoyo integral en actuaciones administrativas distritales.'
      ],
      skills: ['Derecho Administrativo', 'Derecho Tributario', 'Acciones de Tutela', 'Derechos de Petición', 'Trazabilidad Digital'],
      isHighlighted: true
    },
    {
      company: 'Bordados Flyc',
      role: 'Auxiliar Administrativo & Control Documental',
      badge: 'Gestión Administrativa',
      period: 'Enero 2022 – Agosto 2025',
      location: 'Bogotá D.C.',
      description: 'Liderazgo operativo en registro contable, auditoría preventiva de comprobantes y custodia sistemática de archivos.',
      achievements: [
        'Registro y verificación técnica de documentos contables, facturas de proveedores y órdenes de egreso.',
        'Estructuración y control de archivo administrativo y financiero, optimizando los tiempos de auditoría en más de un 35%.',
        'Consolidación de informes periódicos de gestión y soporte documental para cumplimiento normativo interno.'
      ],
      skills: ['Gestión Documental', 'Control Contable', 'Auditoría Interna', 'Microsoft Excel', 'Reportes Ejecutivos']
    },
    {
      company: 'Inversiones y Asesoría ERPO & CIA',
      role: 'Auxiliar de Cartera & Gestión Documental',
      badge: 'Cobro & Cartera',
      period: 'Julio 2016 – Noviembre 2016',
      location: 'Bogotá D.C.',
      description: 'Gestión prejudicial y administrativa de cartera vencida con estricta reserva y manejo de información confidencial.',
      achievements: [
        'Recuperación y depuración de cartera vencida mediante actualización metódica de bases de datos.',
        'Diseño e implementación de formatos de control ofimático para seguimiento y trazabilidad financiera.',
        'Manejo de información sensible y confidencial bajo protocolos de seguridad documental.'
      ],
      skills: ['Recuperación de Cartera', 'Bases de Datos', 'Control Financiero', 'Confidencialidad']
    },
    {
      company: 'Conexel S.A.S.',
      role: 'Responsable de Procesos Administrativos & Servicio',
      badge: 'Operaciones & Control',
      period: 'Enero 2016 – Abril 2016',
      location: 'Bogotá D.C.',
      description: 'Supervisión documental de operaciones comerciales, remisiones y soporte a clientes corporativos.',
      achievements: [
        'Administración y archivo de planillas operativas, remisiones, actas e informes comerciales.',
        'Registro sistemático de operaciones de venta y traslados de inventario en software interno.',
        'Acompañamiento en el control administrativo de la operación comercial garantizando puntualidad y rigor.'
      ],
      skills: ['Procesos Administrativos', 'Servicio al Cliente', 'Control Operativo', 'Sistemas Internos']
    }
  ];

  // Formación & Práctica Jurídica
  readonly education = {
    institution: 'Fundación Universidad Autónoma de Colombia',
    degree: 'Pregrado en Derecho',
    status: '9.º Semestre en Curso',
    completion: 'Finalización Prevista: 2026',
    location: 'Bogotá D.C.',
    consultorio: {
      name: 'Consultorio Jurídico IV (Práctica Jurídica Activa)',
      areas: ['Derecho Civil', 'Derecho Laboral', 'Derecho Penal', 'Derecho de Familia'],
      activities: [
        'Elaboración y radicación de demandas, memoriales, incidentes y conceptos jurídicos aplicados.',
        'Atención personalizada, recepción de casos y orientación jurídica integral a usuarios y ciudadanos.',
        'Sustanciación y seguimiento de procesos en etapa judicial y extrajudicial bajo acompañamiento docente.'
      ]
    }
  };

  // Categorías de Habilidades y Competencias
  readonly skillCategories: SkillCategory[] = [
    {
      title: 'Áreas del Derecho & Especialidad',
      icon: 'scale',
      items: [
        { name: 'Derecho Administrativo', highlight: true },
        { name: 'Derecho Constitucional', highlight: true },
        { name: 'Tributario & Prescripciones', highlight: true },
        { name: 'Derecho Civil & Procesal' },
        { name: 'Derecho Laboral & Seguridad Social' },
        { name: 'Derecho Penal & Sustanciación' }
      ]
    },
    {
      title: 'Técnica & Gestión Jurídica',
      icon: 'file-text',
      items: [
        { name: 'Redacción & Proyección Jurídica', highlight: true },
        { name: 'Acciones de Tutela & Derechos de Petición', highlight: true },
        { name: 'Análisis & Trazabilidad de Expedientes', highlight: true },
        { name: 'Investigación Jurisprudencial' },
        { name: 'Sustanciación de Procesos' },
        { name: 'Gestión Documental & Archivo' }
      ]
    },
    {
      title: 'Herramientas Digitales & Software',
      icon: 'laptop',
      items: [
        { name: 'Microsoft Excel (Análisis de Datos)', highlight: true },
        { name: 'Microsoft Word Jurídico' },
        { name: 'Adobe Acrobat Pro' },
        { name: 'Microsoft Outlook & Teams' },
        { name: 'Sistemas de Información Pública' },
        { name: 'Bases de Datos Jurídicas' }
      ]
    },
    {
      title: 'Competencias Ejecutivas & Éticas',
      icon: 'shield-check',
      items: [
        { name: 'Ética Profesional & Confidencialidad', highlight: true },
        { name: 'Atención & Asesoría al Ciudadano', highlight: true },
        { name: 'Pensamiento Analítico & Rigor' },
        { name: 'Resolución Ágil de Controversias' },
        { name: 'Trabajo en Equipo Multidisciplinario' },
        { name: 'Español (Nativo) · Inglés (Básico)' }
      ]
    }
  ];

  // URL del perfil para compartir
  profileUrl = signal<string>('https://diegomonroy.site/yeni-chacon');

  ngOnInit() {
    if (typeof window !== 'undefined') {
      this.profileUrl.set(window.location.origin + '/yeni-chacon');
      this.originalTitle = this.titleService.getTitle();
      this.titleService.setTitle('Yeni Andrea Chacón Gordillo — Abogada · Perfil Profesional Jurídico');
    }
  }

  ngOnDestroy() {
    if (this.originalTitle) {
      this.titleService.setTitle(this.originalTitle);
    }
  }

  // Generador dinámico de SVG para el código QR
  qrSvgSafe = computed<SafeHtml>(() => {
    const tab = this.activeQrTab();
    let text = this.profileUrl();

    if (tab === 'vcard') {
      text = this.generateVCardString();
    } else if (tab === 'whatsapp') {
      text = `https://wa.me/${this.personalInfo.phoneClean}?text=Hola%20Andrea%2C%20estuve%20revisando%20tu%20perfil%20profesional%20en%20la%20feria%20de%20empleo%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20una%20oportunidad%20en%20nuestro%20equipo.`;
    }

    try {
      const qr = QrCode.encodeText(text, Ecc.MEDIUM);
      // Colores de despacho legal: marco blanco sobre azul marino profundo
      const svgStr = qr.toSvgString(3, '#FFFFFF', '#0A1128');
      return this.sanitizer.bypassSecurityTrustHtml(svgStr);
    } catch (e) {
      console.error('Error generando QR SVG:', e);
      return '';
    }
  });

  // Genera string vCard estándar
  private generateVCardString(): string {
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Chacón Gordillo;Yeni Andrea;;;',
      'FN:Yeni Andrea Chacón Gordillo',
      'ORG:Abogada - Estudiante de Derecho (9.º Semestre)',
      'TITLE:Abogada / Pasante Jurídica',
      `TEL;TYPE=CELL:${this.personalInfo.phone}`,
      `EMAIL:${this.personalInfo.email}`,
      `URL:${this.profileUrl()}`,
      `ADR;TYPE=WORK:;;Kr 50A # 33 - 38 Sur;Bogotá D.C.;Cundinamarca;;Colombia`,
      'NOTE:Perfil Profesional: Énfasis en Derecho Público, Derecho Administrativo, Acciones Constitucionales y Gestión Documental.',
      'END:VCARD'
    ].join('\r\n');
  }

  openQrModal(tab: YeniQrTab = 'profile') {
    this.activeQrTab.set(tab);
    this.isQrModalOpen.set(true);
    this.drawCanvas();
  }

  closeQrModal() {
    this.isQrModalOpen.set(false);
  }

  setQrTab(tab: YeniQrTab) {
    this.activeQrTab.set(tab);
    this.drawCanvas();
  }

  // Copia el enlace directo al portapapeles
  async copyLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(this.profileUrl());
      this.copiedLink.set(true);
      setTimeout(() => this.copiedLink.set(false), 2500);
    }
  }

  // Descarga directa del archivo de contacto vCard (.vcf)
  downloadVCard() {
    const vcardData = this.generateVCardString();
    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Yeni_Andrea_Chacon_Gordillo_Contacto.vcf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Imprimir o Guardar como PDF
  printCV() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  // Renderizado en canvas de alta resolución para exportar imagen PNG del QR
  private drawCanvas() {
    setTimeout(() => {
      const canvas = this.canvasRef()?.nativeElement;
      if (!canvas) return;

      const tab = this.activeQrTab();
      let text = this.profileUrl();
      if (tab === 'vcard') text = this.generateVCardString();
      if (tab === 'whatsapp') text = `https://wa.me/${this.personalInfo.phoneClean}?text=Hola%20Andrea%2C%20estuve%20revisando%20tu%20perfil%20profesional.`;

      try {
        const qr = QrCode.encodeText(text, Ecc.HIGH);
        const size = qr.size;
        const scale = 14;
        const border = 4;
        const dim = (size + border * 2) * scale;

        canvas.width = dim;
        canvas.height = dim;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fondo blanco nítido
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, dim, dim);

        // Módulos en azul institucional
        ctx.fillStyle = '#0A1128';
        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            if (qr.getModule(x, y)) {
              ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
            }
          }
        }
      } catch (err) {
        console.error('Error dibujando canvas QR:', err);
      }
    }, 120);
  }

  // Descarga la imagen PNG del código QR
  downloadQrImage() {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR_Yeni_Andrea_Chacon_${this.activeQrTab()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Compartir nativo si está disponible en dispositivos móviles
  async shareNative() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: 'Yeni Andrea Chacón Gordillo · Perfil Jurídico',
          text: 'Perfil Profesional de Yeni Andrea Chacón Gordillo — Abogada en formación con experiencia en Derecho Público, Gestión Documental y Acciones Constitucionales.',
          url: this.profileUrl()
        });
      } catch (err) {
        console.log('Compartir cancelado o no soportado');
      }
    } else {
      this.openQrModal('profile');
    }
  }
}
