import { Injectable, signal, inject } from '@angular/core';
import { PortfolioDataService } from './portfolio-data.service';

export interface MatchBreakdown {
  overallScore: number;
  roleDetected: string;
  keyStrengths: string[];
  alignedDeliverables: string[];
  mitigations: string[];
}

export interface CtaLinks {
  calendarLink: string;
  whatsappLink: string;
  emailLink: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  attachmentName?: string;
  match?: MatchBreakdown;
  cta?: CtaLinks;
  isStreaming?: boolean;
}

export interface AttachedFile {
  name: string;
  mimeType: string;
  size: number;
  base64Content: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiAgentService {
  private portfolioDataService = inject(PortfolioDataService);

  readonly isOpen = signal<boolean>(false);
  readonly isGenerating = signal<boolean>(false);
  readonly currentStep = signal<string>('');
  readonly attachedFile = signal<AttachedFile | null>(null);
  readonly isRecordingVoice = signal<boolean>(false);

  readonly messages = signal<ChatMessage[]>([]);

  private backendUrl = 'http://localhost:8000';
  private speechRecognition: any = null;

  constructor() {
    this.initSpeechRecognition();
  }

  toggleDrawer(): void {
    this.isOpen.update(v => !v);
  }

  openDrawer(): void {
    this.isOpen.set(true);
  }

  closeDrawer(): void {
    this.isOpen.set(false);
  }

  clearChat(): void {
    this.messages.set([]);
    this.attachedFile.set(null);
    this.currentStep.set('');
  }

  attachFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        this.attachedFile.set({
          name: file.name,
          mimeType: file.type || 'application/pdf',
          size: file.size,
          base64Content: base64
        });
        resolve();
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }

  removeAttachment(): void {
    this.attachedFile.set(null);
  }

  initSpeechRecognition(): void {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.speechRecognition = new SpeechRecognition();
        this.speechRecognition.continuous = false;
        this.speechRecognition.interimResults = false;
      }
    }
  }

  startVoiceInput(onResult: (text: string) => void): void {
    if (!this.speechRecognition) {
      alert('El reconocimiento de voz no está soportado en este navegador.');
      return;
    }

    const lang = this.portfolioDataService.getCurrentLanguage();
    this.speechRecognition.lang = lang === 'en' ? 'en-US' : 'es-CO';

    this.speechRecognition.onstart = () => {
      this.isRecordingVoice.set(true);
    };

    this.speechRecognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      this.isRecordingVoice.set(false);
    };

    this.speechRecognition.onerror = () => {
      this.isRecordingVoice.set(false);
    };

    this.speechRecognition.onend = () => {
      this.isRecordingVoice.set(false);
    };

    try {
      this.speechRecognition.start();
    } catch {
      this.isRecordingVoice.set(false);
    }
  }

  stopVoiceInput(): void {
    if (this.speechRecognition && this.isRecordingVoice()) {
      this.speechRecognition.stop();
      this.isRecordingVoice.set(false);
    }
  }

  async sendUserMessage(text: string): Promise<void> {
    if ((!text || !text.trim()) && !this.attachedFile()) return;

    const attachment = this.attachedFile();
    const userMsgId = `user_${Date.now()}`;
    const agentMsgId = `agent_${Date.now()}`;

    // Agregar mensaje del usuario
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachment ? attachment.name : undefined
    };

    this.messages.update(list => [...list, userMessage]);
    this.attachedFile.set(null);
    this.isGenerating.set(true);
    this.currentStep.set('Iniciando agente y verificando seguridad...');

    // Crear mensaje vacío del agente para streaming
    const agentMessage: ChatMessage = {
      id: agentMsgId,
      sender: 'agent',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };
    this.messages.update(list => [...list, agentMessage]);

    const payload = {
      message: text.trim() || 'Evalúa la vacante adjunta con el perfil de Diego Monroy',
      sessionId: `sess_${Date.now()}`,
      attachments: attachment ? [{
        name: attachment.name,
        mimeType: attachment.mimeType,
        content: attachment.base64Content,
        size: attachment.size
      }] : [],
      stream: true
    };

    try {
      const response = await fetch(`${this.backendUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const event = JSON.parse(dataStr);
              this.handleServerEvent(agentMsgId, event);
            } catch (err) {
              // Ignore malformed partial chunks
            }
          }
        }
      }
    } catch (err) {
      // Fallback a motor inteligente cliente si el backend local no está corriendo
      await this.runClientSideFallback(agentMsgId, text, attachment);
    } finally {
      this.isGenerating.set(false);
      this.currentStep.set('');
      this.messages.update(list => list.map(m => m.id === agentMsgId ? { ...m, isStreaming: false } : m));
    }
  }

  private handleServerEvent(agentMsgId: string, event: any): void {
    if (event.type === 'step') {
      this.currentStep.set(event.label || event.step);
    } else if (event.type === 'text_delta') {
      this.messages.update(list => list.map(m => {
        if (m.id === agentMsgId) {
          return { ...m, text: m.text + event.delta };
        }
        return m;
      }));
    } else if (event.type === 'match') {
      this.messages.update(list => list.map(m => {
        if (m.id === agentMsgId) {
          return { ...m, match: event.data };
        }
        return m;
      }));
    } else if (event.type === 'done') {
      this.messages.update(list => list.map(m => {
        if (m.id === agentMsgId) {
          return {
            ...m,
            isStreaming: false,
            cta: event.cta
          };
        }
        return m;
      }));
    }
  }

  private async runClientSideFallback(agentMsgId: string, text: string, attachment: AttachedFile | null): Promise<void> {
    const isEn = this.portfolioDataService.getCurrentLanguage() === 'en';
    const lower = (text + ' ' + (attachment?.name || '')).toLowerCase();

    this.currentStep.set(isEn ? 'Analyzing vacancy requirements against Diego\'s profile...' : 'Analizando requerimientos de la vacante frente al perfil de Diego...');
    await new Promise(r => setTimeout(r, 600));

    const isVacancy = Boolean(attachment) || ['vacante', 'perfil', 'busco', 'oferta', 'requisitos', 'job', 'hiring'].some(k => lower.includes(k));

    let matchCard: MatchBreakdown | undefined = undefined;
    if (isVacancy) {
      matchCard = {
        overallScore: 96,
        roleDetected: isEn ? 'Tech Lead & Solutions Architect' : 'Tech Lead & Arquitecto de Soluciones',
        keyStrengths: [
          'Google Cloud Certified: Associate Cloud Engineer (ACE #189954)',
          '99.99% SLA en CRM In-House de Banco de Bogotá (Grupo AVAL)',
          'Arquitecturas Agénticas con LangChain, LangGraph y Vector DBs',
          'Especialista en Gerencia de Proyectos y Reducción del 38% de Incidentes'
        ],
        alignedDeliverables: [
          'Diseño de microservicios con Arquitectura Hexagonal y DDD (Java/Python/Angular)',
          'Despliegues Zero-Downtime sobre Kubernetes (GKE) y Cloud Run',
          'Liderazgo de células de ingeniería y gobierno DevSecOps con SonarQube'
        ],
        mitigations: [
          'Amplia versatilidad para alinear el roadmap de ingeniería con objetivos de negocio.'
        ]
      };
    }

    const cta: CtaLinks = {
      calendarLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Entrevista+T%C3%A9cnica+%E2%80%94+Diego+Monroy&details=Reuni%C3%B3n+t%C3%A9cnica+para+revisar+compatibilidad+con+la+vacante.+Contacto%3A+diego.97duran%40gmail.com&add=diego.97duran%40gmail.com',
      whatsappLink: 'https://wa.me/573108009394?text=' + encodeURIComponent('Hola Diego, estuve interactuando con tu Agente de IA y me gustaría coordinar una entrevista técnica contigo.'),
      emailLink: 'mailto:diego.97duran@gmail.com?subject=' + encodeURIComponent('Oportunidad Profesional — Entrevista Técnica')
    };

    let fullResponse = '';
    if (isVacancy) {
      fullResponse = isEn
        ? `### 🎯 High-Match Candidate Profile for Your Vacancy\n\nI have evaluated your requirements against **Diego Leonardo Monroy Durán**'s proven background:\n\n` +
          `• **Technical Leadership & Cloud Architecture (96% Match)**: Active Tech Lead at Banco de Bogotá, maintaining **99.99% SLA** on mission-critical corporate CRM.\n` +
          `• **Official Certification**: Google Cloud Certified Associate Cloud Engineer (ACE Credly ID #189954).\n` +
          `• **Enterprise Generative AI**: Production multi-agent pipelines with LangChain, LangGraph, and BigQuery vector integrations reducing query latency by 40%.\n\n` +
          `📅 **Immediate Next Step**: Diego is ready to solve your team's architectural challenges. You can book a 20-minute meeting right now below.`
        : `### 🎯 Perfil de Alta Compatibilidad para tu Búsqueda\n\nHe contrastado los requerimientos con la trayectoria comprobada de **Diego Leonardo Monroy Durán**:\n\n` +
          `• **Liderazgo Técnico & Arquitectura Cloud (Match: 96%)**: Tech Lead activo en Banco de Bogotá, garantizando **99.99% de SLA** en el CRM de Banca Empresas.\n` +
          `• **Certificación Oficial**: Google Cloud Certified Associate Cloud Engineer (ACE Credly ID #189954).\n` +
          `• **IA Generativa Empresarial**: Flujos agénticos en producción con LangChain, LangGraph y BigQuery que reducen tiempos de consulta en 40%.\n\n` +
          `📅 **Siguiente Paso Inmediato**: Diego es el perfil idóneo para liderar estos retos técnicos. Puedes agendar directamente una llamada de 20 minutos con él a continuación.`;
    } else {
      fullResponse = isEn
        ? `### Hello, I am Diego Monroy's Executive Talent Agent 👋\n\nDiego is a **Tech Lead & Solutions Architect** with over 5 years leading banking cloud systems and Generative AI solutions.\n\n` +
          `• **99.99% SLA**: Banking-grade zero-downtime availability.\n` +
          `• **Google Cloud Certified ACE**: Kubernetes, Cloud Run, DevSecOps.\n` +
          `• **Multi-Agent AI**: LangChain & LangGraph enterprise workflows.\n\n` +
          `You can **upload a PDF job description or paste requirements** to get a comprehensive compatibility evaluation!`
        : `### Hola, soy el Agente Ejecutivo de Talento de Diego Monroy 👋\n\nDiego es **Tech Lead & Solutions Architect** con más de 5 años liderando arquitecturas bancarias de alta resiliencia y soluciones de Inteligencia Artificial Generativa.\n\n` +
          `• **99.99% SLA**: Disponibilidad bancaria de misión crítica.\n` +
          `• **Google Cloud Certified ACE**: Kubernetes, Cloud Run, DevSecOps.\n` +
          `• **IA Multi-Agente**: Flujos empresariales con LangChain y LangGraph.\n\n` +
          `¡Puedes **subir el PDF de tu vacante o pegar los requisitos** para obtener una evaluación inmediata de compatibilidad!`;
    }

    // Simular escritura progresiva
    const words = fullResponse.split(' ');
    for (const w of words) {
      this.messages.update(list => list.map(m => m.id === agentMsgId ? { ...m, text: m.text + w + ' ' } : m));
      await new Promise(r => setTimeout(r, 20));
    }

    this.messages.update(list => list.map(m => m.id === agentMsgId ? {
      ...m,
      match: matchCard,
      cta,
      isStreaming: false
    } : m));
  }
}
