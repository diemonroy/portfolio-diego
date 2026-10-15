import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  totalConversations: number;
  totalVacancies: number;
  avgMatchScore: number;
  totalConversions: number;
  conversionRate: number;
  conversionsByType: { [key: string]: number };
  topRoles: Array<{ role: string; count: number; avgScore: number }>;
  recentQuestions: Array<{ query: string; timestamp: string; sessionId: string }>;
  popularTopics: Array<{ topic: string; searches: number }>;
}

export interface ConversationSummary {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  roleDetected: string;
  matchScore: number;
  conversionType?: string;
  status: string;
  lastMessage: string;
  messageCount: number;
  recruiterName?: string;
  companyName?: string;
  likedAspect?: string;
  interviewModality?: 'presencial' | 'virtual' | string;
}

export interface ConversationDetail {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  roleDetected?: string;
  matchScore?: number;
  conversionType?: string;
  status: string;
  recruiterName?: string;
  companyName?: string;
  likedAspect?: string;
  interviewModality?: 'presencial' | 'virtual' | string;
  messages: Array<{
    sender: 'user' | 'diego';
    content: string;
    attachmentName?: string;
    timestamp: string;
  }>;
}

export interface SkillsDemandAnalytics {
  totalSkillInquiries: number;
  topDemandedSkills: Array<{
    skillId: string;
    skillName: string;
    category: string;
    count: number;
    percentage: number;
  }>;
  demandByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  underDemandedSkills: Array<{
    skillId: string;
    skillName: string;
    category: string;
    level: string;
    proof: string;
  }>;
  recentInquiries: Array<{
    skillName: string;
    category: string;
    companyName: string;
    inquiryType: string;
    timestamp: string;
  }>;
}

export interface MarketIntelligenceReport {
  totalSessionsAnalyzed: number;
  topRolesSought: Array<{
    role: string;
    count: number;
    avgScore: number;
  }>;
  topCompanies: Array<{
    company: string;
    count: number;
  }>;
  attractivenessDrivers: Array<{
    driver: string;
    description: string;
    metric: string;
    impact: string;
  }>;
  conversionFunnel: {
    totalVisitors: number;
    techConversations: number;
    highMatchProfiles: number;
    interviewRequests: number;
    conversionRate: number;
  };
}

export interface DatabaseStatus {
  status: string;
  engine: string;
  databasePath: string;
  sizeFormatted: string;
  journalMode: string;
  tables: {
    sessions: number;
    messages: number;
    conversion_events: number;
    skill_demand_events?: number;
    market_insights?: number;
  };
  metrics: {
    presencialInterviews: number;
    virtualInterviews: number;
    totalConversions: number;
    skillInquiries?: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AiDashboardService {
  private get backendUrl(): string {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:8000';
    }
    return environment.apiUrl;
  }

  readonly isOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly stats = signal<DashboardStats | null>(null);
  readonly conversations = signal<ConversationSummary[]>([]);
  readonly selectedSession = signal<ConversationDetail | null>(null);
  readonly databaseStatus = signal<DatabaseStatus | null>(null);
  readonly skillsDemand = signal<SkillsDemandAnalytics | null>(null);
  readonly marketIntelligence = signal<MarketIntelligenceReport | null>(null);

  openDashboard(): void {
    this.isOpen.set(true);
    this.fetchData();
  }

  closeDashboard(): void {
    this.isOpen.set(false);
  }

  toggleDashboard(): void {
    if (this.isOpen()) {
      this.closeDashboard();
    } else {
      this.openDashboard();
    }
  }

  async fetchData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [statsRes, convsRes, dbRes, demandRes, intelRes] = await Promise.all([
        fetch(`${this.backendUrl}/api/dashboard/stats`).catch(() => null),
        fetch(`${this.backendUrl}/api/dashboard/conversations`).catch(() => null),
        fetch(`${this.backendUrl}/api/database/status`).catch(() => null),
        fetch(`${this.backendUrl}/api/analytics/skills-demand`).catch(() => null),
        fetch(`${this.backendUrl}/api/analytics/market-intelligence`).catch(() => null)
      ]);

      if (statsRes && statsRes.ok) {
        const statsData = await statsRes.json();
        this.stats.set(statsData);
      } else {
        this.setMockStats();
      }

      if (dbRes && dbRes.ok) {
        const dbData = await dbRes.json();
        this.databaseStatus.set(dbData);
      }

      if (convsRes && convsRes.ok) {
        const convsData = await convsRes.json();
        this.conversations.set(convsData);
        if (convsData.length > 0 && !this.selectedSession()) {
          this.selectSession(convsData[0].sessionId);
        }
      } else {
        this.setMockConversations();
      }

      if (demandRes && demandRes.ok) {
        const demandData = await demandRes.json();
        this.skillsDemand.set(demandData);
      } else {
        this.setMockDemandAnalytics();
      }

      if (intelRes && intelRes.ok) {
        const intelData = await intelRes.json();
        this.marketIntelligence.set(intelData);
      } else {
        this.setMockMarketIntelligence();
      }
    } catch {
      this.setMockStats();
      this.setMockConversations();
      this.setMockDemandAnalytics();
      this.setMockMarketIntelligence();
    } finally {
      this.isLoading.set(false);
    }
  }

  async selectSession(sessionId: string): Promise<void> {
    try {
      const res = await fetch(`${this.backendUrl}/api/dashboard/conversations/${sessionId}`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        this.selectedSession.set(data);
        return;
      }
    } catch {
      // fallback
    }

    // Fallback con datos locales si está offline
    const summary = this.conversations().find(c => c.sessionId === sessionId);
    if (summary) {
      this.selectedSession.set({
        sessionId: summary.sessionId,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
        roleDetected: summary.roleDetected,
        matchScore: summary.matchScore,
        conversionType: summary.conversionType,
        status: summary.status,
        recruiterName: summary.recruiterName,
        companyName: summary.companyName,
        likedAspect: summary.likedAspect,
        interviewModality: summary.interviewModality,
        messages: [
          {
            sender: 'user',
            content: summary.lastMessage,
            timestamp: summary.createdAt
          },
          {
            sender: 'diego',
            content: `¡Hola! Con mucho gusto converso contigo sobre mi experiencia como ${summary.roleDetected}. Actualmente en Banco de Bogotá lidero el CRM de Banca Empresas con un SLA del 99.99%, cuento con certificación oficial Google Cloud ACE y sistemas agénticos de IA en producción.`,
            timestamp: summary.updatedAt
          }
        ]
      });
    }
  }

  private setMockStats(): void {
    this.stats.set({
      totalConversations: 12,
      totalVacancies: 9,
      avgMatchScore: 96.4,
      totalConversions: 7,
      conversionRate: 58.3,
      conversionsByType: {
        calendar: 4,
        whatsapp: 3
      },
      topRoles: [
        { role: 'Tech Lead & Solutions Architect', count: 5, avgScore: 97.5 },
        { role: 'Cloud Solutions Architect (GCP)', count: 3, avgScore: 96.0 },
        { role: 'Engineering Manager / GenAI Lead', count: 2, avgScore: 95.0 }
      ],
      recentQuestions: [
        { query: '¿Qué hace él en su rol actual?', timestamp: new Date().toISOString(), sessionId: 'sess_1' },
        { query: 'Buscamos un Tech Lead con Python y GCP para banca', timestamp: new Date(Date.now() - 3600000).toISOString(), sessionId: 'sess_2' },
        { query: '¿Qué experiencia tiene con LangChain y BigQuery?', timestamp: new Date(Date.now() - 7200000).toISOString(), sessionId: 'sess_3' }
      ],
      popularTopics: [
        { topic: 'Tech Lead & Arquitectura Bancaria', searches: 34 },
        { topic: 'Google Cloud ACE & Kubernetes', searches: 29 },
        { topic: 'IA Generativa & LangGraph', searches: 26 },
        { topic: 'SLA 99.99% en Banco de Bogotá', searches: 22 },
        { topic: 'Spring Boot & Python FastAPI', searches: 19 },
        { topic: 'Agendamiento de Entrevista', searches: 15 }
      ]
    });
  }

  private setMockConversations(): void {
    const list: ConversationSummary[] = [
      {
        sessionId: 'sess_live_101',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        roleDetected: 'Tech Lead & Solutions Architect',
        matchScore: 98,
        conversionType: 'calendar',
        status: 'converted',
        recruiterName: 'Carolina Méndez',
        companyName: 'Fintech Regional (Bogotá)',
        likedAspect: 'Arquitectura Resiliente & SLA 99.99%',
        interviewModality: 'presencial',
        lastMessage: 'Nos gustaría reunirnos en nuestras oficinas en Bogotá para conversar en persona.',
        messageCount: 4
      },
      {
        sessionId: 'sess_live_102',
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
        roleDetected: 'Cloud Architect (GCP / Kubernetes)',
        matchScore: 95,
        conversionType: 'whatsapp',
        status: 'converted',
        recruiterName: 'Andrés Morales',
        companyName: 'Consultora Cloud Enterprise',
        likedAspect: 'Google Cloud Certified ACE & Kubernetes',
        interviewModality: 'virtual',
        lastMessage: '¿Qué certificaciones y experiencia en Kubernetes Zero-Downtime tiene?',
        messageCount: 3
      },
      {
        sessionId: 'sess_live_103',
        createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 290).toISOString(),
        roleDetected: 'AI Engineer / GenAI Specialist',
        matchScore: 96,
        status: 'active',
        recruiterName: 'Valeria Gómez',
        companyName: 'Startup IA Bancaria',
        likedAspect: 'LangGraph & RAG en BigQuery',
        interviewModality: 'presencial',
        lastMessage: 'Hola Diego, soy Valeria de Startup IA. ¿Podríamos vernos esta semana en la oficina?',
        messageCount: 5
      }
    ];
    this.conversations.set(list);
    this.selectSession(list[0].sessionId);
  }

  private setMockDemandAnalytics(): void {
    this.skillsDemand.set({
      totalSkillInquiries: 63,
      topDemandedSkills: [
        { skillId: 'tech_leadership', skillName: 'Liderazgo Técnico & DDD', category: 'Liderazgo & Gestión', count: 18, percentage: 28.5 },
        { skillId: 'gcp_architecture', skillName: 'Google Cloud & Kubernetes', category: 'Cloud & DevOps', count: 16, percentage: 25.4 },
        { skillId: 'genai_rag', skillName: 'Sistemas Agénticos & GenAI', category: 'IA Generativa', count: 14, percentage: 22.2 },
        { skillId: 'banking_sla', skillName: 'SLA 99.99% & Misión Crítica', category: 'Arquitectura & Backend', count: 9, percentage: 14.3 },
        { skillId: 'fastapi_spring', skillName: 'FastAPI & Spring Boot', category: 'Arquitectura & Backend', count: 6, percentage: 9.5 }
      ],
      demandByCategory: [
        { category: 'Liderazgo & Gestión', count: 18, percentage: 28.5 },
        { category: 'Cloud & DevOps', count: 16, percentage: 25.4 },
        { category: 'IA Generativa', count: 14, percentage: 22.2 },
        { category: 'Arquitectura & Backend', count: 15, percentage: 23.8 }
      ],
      underDemandedSkills: [
        { skillId: 'hexagonal_arch', skillName: 'Arquitectura Hexagonal & Clean Code', category: 'Arquitectura & Backend', level: 'Experto', proof: 'Banco de Bogotá CRM' },
        { skillId: 'angular_enterprise', skillName: 'Frontend Angular 19 Empresarial', category: 'Frontend', level: 'Avanzado', proof: 'Banco de Bogotá Portal' },
        { skillId: 'pmi_management', skillName: 'Gerencia de Proyectos PMI', category: 'Liderazgo & Gestión', level: 'Especialista', proof: 'Posgrado Univ. de Boyacá' }
      ],
      recentInquiries: [
        { skillName: 'Google Cloud & Kubernetes', category: 'Cloud & DevOps', companyName: 'Fintech Regional', inquiryType: 'direct_inquiry', timestamp: new Date().toISOString() },
        { skillName: 'Sistemas Agénticos & GenAI', category: 'IA Generativa', companyName: 'Startup IA Bancaria', inquiryType: 'vacancy_requirement', timestamp: new Date(Date.now() - 3600000).toISOString() }
      ]
    });
  }

  private setMockMarketIntelligence(): void {
    this.marketIntelligence.set({
      totalSessionsAnalyzed: 14,
      topRolesSought: [
        { role: 'Tech Lead & Solutions Architect', count: 12, avgScore: 96.5 },
        { role: 'Cloud Architect (GCP / Kubernetes)', count: 8, avgScore: 95.0 },
        { role: 'Staff Engineer / Engineering Lead', count: 5, avgScore: 94.2 }
      ],
      topCompanies: [
        { company: 'Banca & Fintechs Colombia', count: 7 },
        { company: 'Tech Consultoras Multinacionales', count: 5 },
        { company: 'Scale-ups & Startups Serie A+', count: 4 }
      ],
      attractivenessDrivers: [
        {
          driver: 'Garantía de SLA 99.99% en Banca de Gran Escala',
          description: 'Banco de Bogotá (Grupo AVAL): operación sin caídas en CRM de Banca Empresas.',
          metric: '99.99% SLA sostenido en producción',
          impact: 'Alta confianza en estabilidad operativa'
        },
        {
          driver: 'Certificación Oficial GCP Associate Cloud Engineer (ACE)',
          description: 'Credly ID: 189954 (vigente 2026-2029) + Badge Load Balancing en Compute Engine.',
          metric: 'Validación oficial de Google Cloud',
          impact: 'Tranquilidad en arquitecturas Cloud nativas'
        },
        {
          driver: 'Doble Perfil Técnico + Especialización en Gerencia',
          description: 'Tech Lead que programa con excelencia y comprende ROI, estándares PMI y alineación VP.',
          metric: 'Posgrado Universidad de Boyacá (2023)',
          impact: 'Comunicación fluida con stakeholders de negocio'
        },
        {
          driver: 'Adopción de Sistemas Agénticos & GenAI en Producción',
          description: 'Orquestación con LangGraph, Gemini, BigQuery y agentes conversacionales autónomos.',
          metric: '-40% latencia en consultas complejas',
          impact: 'Capacidad de liderar la ola de Inteligencia Artificial'
        }
      ],
      conversionFunnel: {
        totalVisitors: 48,
        techConversations: 14,
        highMatchProfiles: 8,
        interviewRequests: 5,
        conversionRate: 10.4
      }
    });
  }
}
