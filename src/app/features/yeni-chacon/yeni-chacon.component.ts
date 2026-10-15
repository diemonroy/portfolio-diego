import { Component, OnInit, OnDestroy, signal, computed, inject, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml, Title } from '@angular/platform-browser';
import { QrCode, Ecc } from '../../core/utils/qr-code';

export type YeniQrTab = 'profile' | 'ats' | 'vcard' | 'whatsapp';
export type YeniViewMode = 'executive' | 'ats';

export interface WorkExperience {
  company: string;
  role: string;
  badge: string;
  badgeType?: 'public' | 'corp' | 'finance';
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
  badge: string;
  items: { name: string; level?: string; highlight?: boolean }[];
}

export interface LegalCourse {
  title: string;
  institution: string;
  year: string;
  badge: string;
  description: string;
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
  activeViewMode = signal<YeniViewMode>('executive');
  isQrModalOpen = signal<boolean>(false);
  activeQrTab = signal<YeniQrTab>('profile');
  copiedLink = signal<boolean>(false);
  activeSection = signal<string>('profile');

  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('qrCanvas');

  // Datos personales de contacto
  readonly personalInfo = {
    name: 'Yeni Andrea Chacón Gordillo',
    title: 'Abogada en Formación · Énfasis en Derecho Público, Gestión Documental & Acciones Constitucionales',
    subtitle: '9.º Semestre de Derecho · Fundación Universidad Autónoma de Colombia',
    phone: '+57 310 541 3336',
    phoneClean: '573105413336',
    email: 'yeni0314@hotmail.com',
    location: 'Bogotá D.C., Colombia',
    address: 'Kr 50A # 33 - 38 Sur',
    linkedinUrl: 'https://linkedin.com/in/yenichacon',
    linkedinDisplay: 'linkedin.com/in/yenichacon',
    gradYear: '2026',
    statusBadge: 'Disponible para Vinculación Inmediata',
    atsFileUrl: 'assets/CV_Yeni_Chacon_ATS.html'
  };

  // Experiencia Laboral Detallada
  readonly experiences: WorkExperience[] = [
    {
      company: 'Secretaría Distrital de Hacienda',
      role: 'Pasante Jurídica · Verificación Tributaria & Acciones Constitucionales',
      badge: 'Sector Público Distrital',
      badgeType: 'public',
      period: 'Noviembre 2025 – Febrero 2026',
      location: 'Bogotá D.C.',
      description: 'Soporte técnico-jurídico sustantivo en la gestión de obligaciones tributarias distritales, atención prioritaria de garantías constitucionales y depuración masiva de expedientes.',
      achievements: [
        'Análisis exhaustivo de bases de datos para verificación de causales y procedencia jurídica de prescripción de obligaciones tributarias distritales conforme al Estatuto Tributario.',
        'Proyección fundamentada de respuestas a acciones de tutela y derechos de petición bajo estrictos estándares jurisprudenciales y términos de ley perentorios, previniendo desacatos.',
        'Organización, depuración y foliación de expedientes digitales garantizando total trazabilidad y cadena de custodia documental institucional.',
        'Emisión de conceptos jurídicos previos y apoyo integral en actuaciones administrativas distritales ante contribuyentes.'
      ],
      skills: ['Derecho Tributario', 'Prescripciones', 'Acciones de Tutela', 'Derechos de Petición', 'CPACA', 'Excel Fiscal', 'SI Capital'],
      isHighlighted: true
    },
    {
      company: 'Bordados Flyc',
      role: 'Auxiliar Administrativa y Control Documental',
      badge: 'Sector Manufacturero & Comercial',
      badgeType: 'corp',
      period: 'Enero 2022 – Agosto 2025 (3 años y 8 meses)',
      location: 'Bogotá D.C.',
      description: 'Supervisión integral de procesos administrativos, auditoría preliminar de comprobantes contables y organización física y digital de la memoria documental de la empresa.',
      achievements: [
        'Verificación contable, auditoría preventiva de comprobantes de egreso, facturación electrónica y recibos de caja menor.',
        'Organización del archivo documental físico y digital, logrando reducir tiempos de consulta interna de expedientes en más del 35%.',
        'Conciliación mensual de cuentas por pagar y seguimiento a proveedores comerciales con cero inconsistencias en auditorías internas.'
      ],
      skills: ['Gestión Documental', 'Auditoría Administrativa', 'Control de Archivo', 'Conciliación', 'Microsoft Excel', 'Facturación']
    },
    {
      company: 'Inversiones y Asesoría ERPO & CIA',
      role: 'Asistente de Cobranza & Gestión Prejudicial',
      badge: 'Servicios Financieros & Cartera',
      badgeType: 'finance',
      period: 'Julio 2016 – Noviembre 2016',
      location: 'Bogotá D.C.',
      description: 'Gestión telefónica y documental de recuperación de cartera vencida con estricto apego a normas de protección de datos y conciliación.',
      achievements: [
        'Negociación estructurada de acuerdos de pago cumpliendo lineamientos de Habeas Data (Ley 1266 de 2008).',
        'Consolidación diaria de informes de gestión de cobro y registro fidedigno en el software de cartera.'
      ],
      skills: ['Cobro Prejudicial', 'Habeas Data', 'Negociación', 'Seguimiento de Cartera']
    },
    {
      company: 'Conexel S.A.S.',
      role: 'Auxiliar de Operaciones y Archivo',
      badge: 'Servicios Empresariales',
      badgeType: 'corp',
      period: 'Enero 2016 – Abril 2016',
      location: 'Bogotá D.C.',
      description: 'Control de planillas operativas, radicación de correspondencia y custodia de expedientes contractuales.',
      achievements: [
        'Revisión y digitalización de planillas de servicios y archivo de contratos.',
        'Atención de solicitudes internas de consulta documental con altos estándares de orden y celeridad.'
      ],
      skills: ['Control Operativo', 'Archivo Digital', 'Radicación']
    }
  ];

  // Formación Académica & Práctica Forense
  readonly education = {
    degree: 'Pregrado en Derecho (9.º Semestre en Curso)',
    institution: 'Fundación Universidad Autónoma de Colombia',
    period: '2020 – 2026 (En Curso)',
    location: 'Bogotá D.C.',
    clinic: {
      name: 'Práctica Forense Integral — Consultorio Jurídico IV',
      areas: [
        { name: 'Derecho Civil', desc: 'Contratos, obligaciones, procesos declarativos y responsabilidad civil.' },
        { name: 'Derecho Laboral', desc: 'Liquidación de acreencias laborales, contratos de trabajo y reclamaciones ante empleadores.' },
        { name: 'Derecho Penal', desc: 'Acompañamiento en diligencias preliminares, redacción de memoriales y garantías procesales.' },
        { name: 'Derecho de Familia', desc: 'Procesos de alimentos, custodias, fijación de visitas y conciliación extrajudicial.' }
      ],
      focus: 'Atención directa a ciudadanos, asesoría jurídica a población vulnerable, elaboración y radicación de demandas, conceptos jurídicos y sustanciación procesal.'
    }
  };

  // Cursos y Actualización Jurídica
  readonly legalCourses: LegalCourse[] = [
    {
      title: 'Actualización en Procedimiento Administrativo y CPACA (Ley 1437/2011)',
      institution: 'Formación Complementaria & Práctica Forense',
      year: '2025',
      badge: 'Derecho Administrativo',
      description: 'Profundización en actuaciones administrativas, recursos procesales de reposición y apelación, silencios administrativos y trámite contencioso.'
    },
    {
      title: 'Técnica de Proyección y Trámite de Acciones de Tutela y Habeas Data',
      institution: 'Secretaría Distrital de Hacienda / Práctica Constitucional',
      year: '2025',
      badge: 'Derecho Constitucional',
      description: 'Estructuración fáctica y jurídica de respuestas constitucionales, términos perentorios y prevención de incidentes de desacato.'
    },
    {
      title: 'Gestión Documental, TRD y Cadena de Custodia en Entidades Públicas',
      institution: 'Archivo Institucional Distrital',
      year: '2025',
      badge: 'Gestión Pública',
      description: 'Normativa AGN (Archivo General de la Nación), tablas de retención documental, depuración de expedientes físicos y digitales.'
    },
    {
      title: 'Gestión y Análisis de Bases de Datos en Microsoft Excel (Tablas Dinámicas y Fórmulas)',
      institution: 'Capacitación Aplicada a Gestión de Cartera',
      year: '2024',
      badge: 'Herramientas Digitales',
      description: 'Cruce masivo de información fiscal, filtros avanzados, fórmulas lógicas y validación de prescripciones de obligaciones.'
    }
  ];

  // Matriz de Competencias Clave
  readonly skillCategories: SkillCategory[] = [
    {
      title: 'Áreas del Derecho Aplicado',
      icon: '⚖️',
      badge: 'Fundamento Jurídico',
      items: [
        { name: 'Derecho Administrativo & Público', highlight: true },
        { name: 'Acciones Constitucionales (Tutela y Petición)', highlight: true },
        { name: 'Derecho Tributario (Prescripciones de Cobro)', highlight: true },
        { name: 'Derecho Civil & Contractual' },
        { name: 'Derecho Laboral Individual' },
        { name: 'Derecho de Familia & Alimentos' }
      ]
    },
    {
      title: 'Técnica y Redacción Jurídica',
      icon: '📝',
      badge: 'Práctica Forense',
      items: [
        { name: 'Proyección de Acciones de Tutela', highlight: true },
        { name: 'Respuestas a Derechos de Petición', highlight: true },
        { name: 'Sustanciación y Conceptos Jurídicos', highlight: true },
        { name: 'Elaboración de Demandas y Memoriales' },
        { name: 'Recursos de Reposición y Apelación' },
        { name: 'Verificación de Plazos y Términos Judiciales' }
      ]
    },
    {
      title: 'Gestión Documental y Procesal',
      icon: '📁',
      badge: 'Control Institucional',
      items: [
        { name: 'Foliación y Custodia de Expedientes', highlight: true },
        { name: 'Depuración de Bases de Datos Fiscales', highlight: true },
        { name: 'Manejo de Tablas de Retención (TRD)' },
        { name: 'Archivo Digital y Trazabilidad' },
        { name: 'Auditoría Preventiva de Soportes' },
        { name: 'Cadena de Custodia Documental' }
      ]
    },
    {
      title: 'Herramientas Digitales & Sistemas',
      icon: '💻',
      badge: 'Ofimática Avanzada',
      items: [
        { name: 'Microsoft Excel (Tablas Dinámicas & Fórmulas)', highlight: true },
        { name: 'Microsoft Word Jurídico & Plantillas', highlight: true },
        { name: 'Adobe Acrobat Pro (Foliación Digital)', highlight: true },
        { name: 'Sistemas Distritales (SI Capital / Correspondencia)' },
        { name: 'Consulta Procesal Rama Judicial (Tyba / Samai)' },
        { name: 'Bases Jurídicas (vLex / Juriscol)' }
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

  // Cambio de modo de visualización (Perfil Ejecutivo vs CV ATS)
  setViewMode(mode: YeniViewMode) {
    this.activeViewMode.set(mode);
  }

  // Abrir la versión independiente de CV ATS en nueva pestaña
  openAtsCvWindow() {
    if (typeof window !== 'undefined') {
      window.open('assets/CV_Yeni_Chacon_ATS.html', '_blank');
    }
  }

  // Generador dinámico de SVG para el código QR
  qrSvgSafe = computed<SafeHtml>(() => {
    const tab = this.activeQrTab();
    let text = this.profileUrl();

    if (tab === 'ats') {
      text = (typeof window !== 'undefined' ? window.location.origin : 'https://diegomonroy.site') + '/assets/CV_Yeni_Chacon_ATS.html';
    } else if (tab === 'vcard') {
      text = this.generateVCardString();
    } else if (tab === 'whatsapp') {
      text = `https://wa.me/${this.personalInfo.phoneClean}?text=Hola%20Andrea%2C%20estuve%20revisando%20tu%20perfil%20profesional%20en%20la%20feria%20de%20empleo%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20una%20oportunidad%20en%20nuestro%20equipo.`;
    }

    try {
      const qr = QrCode.encodeText(text, Ecc.MEDIUM);
      // Colores de despacho editorial: fondo blanco limpio con módulos en azul marino sobrio
      const svgStr = qr.toSvgString(3, '#FFFFFF', '#1E3A8A');
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

  // Dibuja el QR en canvas para exportar a PNG de alta resolución
  private drawCanvas() {
    setTimeout(() => {
      const canvasEl = this.canvasRef()?.nativeElement;
      if (!canvasEl) return;

      const tab = this.activeQrTab();
      let text = this.profileUrl();
      if (tab === 'ats') {
        text = (typeof window !== 'undefined' ? window.location.origin : 'https://diegomonroy.site') + '/assets/CV_Yeni_Chacon_ATS.html';
      } else if (tab === 'vcard') {
        text = this.generateVCardString();
      } else if (tab === 'whatsapp') {
        text = `https://wa.me/${this.personalInfo.phoneClean}?text=Hola%20Andrea%2C%20estuve%20revisando%20tu%20perfil%20profesional%20en%20la%20feria%20de%20empleo%20y%20me%20gustar%C3%ADa%20conversar%20sobre%20una%20oportunidad%20en%20nuestro%20equipo.`;
      }

      try {
        const qr = QrCode.encodeText(text, Ecc.HIGH);
        const scale = 14;
        const border = 4;
        const size = (qr.size + border * 2) * scale;

        canvasEl.width = size;
        canvasEl.height = size;

        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        // Fondo blanco nítido
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, size, size);

        // Módulos en azul marino sobrio
        ctx.fillStyle = '#1E3A8A';

        for (let y = 0; y < qr.size; y++) {
          for (let x = 0; x < qr.size; x++) {
            if (qr.getModule(x, y)) {
              ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
            }
          }
        }
      } catch (err) {
        console.error('Error dibujando canvas QR:', err);
      }
    }, 50);
  }

  // Descarga del QR como imagen PNG
  downloadQrImage() {
    const canvasEl = this.canvasRef()?.nativeElement;
    if (!canvasEl) return;

    const link = document.createElement('a');
    link.download = `QR_Yeni_Chacon_${this.activeQrTab().toUpperCase()}.png`;
    link.href = canvasEl.toDataURL('image/png');
    link.click();
  }

  // Descarga directa del archivo .vcf para el teléfono del reclutador
  downloadVCard() {
    const vcardData = this.generateVCardString();
    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Yeni_Andrea_Chacon_Gordillo_Contacto.vcf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Copia el enlace al portapapeles
  copyProfileLink() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(this.profileUrl()).then(() => {
        this.copiedLink.set(true);
        setTimeout(() => this.copiedLink.set(false), 2500);
      });
    }
  }

  // Compartir nativo (móvil)
  shareProfile() {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({
        title: 'Yeni Andrea Chacón Gordillo — Perfil Profesional Jurídico',
        text: 'Conoce el perfil profesional de Yeni Andrea Chacón Gordillo, Abogada en formación con énfasis en Derecho Público y Gestión Documental.',
        url: this.profileUrl()
      }).catch(() => {
        this.copyProfileLink();
      });
    } else {
      this.copyProfileLink();
    }
  }

  // Disparador de impresión / exportar a PDF
  printCV() {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }
}
