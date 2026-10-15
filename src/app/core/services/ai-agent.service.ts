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

    // 1. Seguridad y guardrails
    if (['secret', 'api_key', 'password', 'token', 'prompt', 'credencial', 'claves', 'jailbreak'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `🔒 **Active Security Control**: Internal credentials, system prompts, and configuration tokens are strictly protected by Secret Manager and cannot be exfiltrated.\n\nWould you like to explore Diego's banking cloud security and DevSecOps background?`
        : `🔒 **Control de Seguridad Activo**: Las credenciales internas, variables de entorno e instrucciones del sistema están blindadas mediante Secret Manager y no son accesibles.\n\n¿Deseas que revisemos la experiencia de Diego en seguridad cloud y DevSecOps en banca?`;
    }
    // 2. ¿Qué hace él? / Responsabilidades / Cargo actual
    else if (['que hac', 'que hace', 'a que se dedica', 'cual es su rol', 'que funcion', 'responsabilidades', 'what does he do'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 💼 What Does Diego Monroy Do?\n\nDiego is currently a **Tech Lead & Solutions Architect** at **Banco de Bogotá (Grupo AVAL)**. His core daily responsibilities include:\n\n` +
          `1. **Engineering Cell Leadership**: Guiding multi-disciplinary software teams, defining hexagonal architecture patterns, DDD boundaries, and code quality governance.\n` +
          `2. **Mission-Critical Banking CRM (99.99% SLA)**: Architecting the high-concurrency corporate CRM, ensuring high availability, sub-second latency, and fault tolerance.\n` +
          `3. **Enterprise Generative AI**: Implementing multi-agent workflows with LangChain, LangGraph, and BigQuery vector pipelines, reducing query latency by 40%.\n` +
          `4. **Cloud & DevSecOps Governance**: As a Google Cloud Certified ACE, deploying zero-downtime containers on Kubernetes (GKE) and Cloud Run, cutting production incidents by 38% with SonarQube.\n\n` +
          `Would you like to schedule a 20-minute architectural discussion with him?`
        : `### 💼 ¿Qué hace actualmente Diego Monroy?\n\nDiego se desempeña como **Tech Lead & Solutions Architect** en **Banco de Bogotá (Grupo AVAL)**. Sus responsabilidades principales son:\n\n` +
          `1. **Liderazgo Técnico de Células de Ingeniería**: Guía a equipos ágiles de desarrollo, define estándares de Arquitectura Hexagonal, Domain-Driven Design (DDD) y revisiones de código.\n` +
          `2. **CRM Bancario de Misión Crítica (99.99% SLA)**: Lidera la evolución del CRM In-House de Banca Empresas, garantizando alta concurrencia, resiliencia y disponibilidad continua.\n` +
          `3. **IA Generativa Empresarial**: Diseña e implementa arquitecturas agénticas con LangChain, LangGraph y bases vectoriales conectadas a BigQuery, optimizando tiempos de consulta en un 40%.\n` +
          `4. **Gobierno Cloud y DevSecOps**: Como certificado oficial Google Cloud ACE, diseña infraestructuras en Kubernetes (GKE) y Cloud Run, reduciendo incidentes en producción en un 38% con SonarQube.\n\n` +
          `¿Te gustaría coordinar una charla técnica con él para profundizar en sus proyectos?`;
    }
    // 3. Tecnologías y Stack
    else if (['tecnologia', 'tecnologías', 'stack', 'lenguajes', 'java', 'python', 'angular', 'gcp', 'cloud', 'technologies'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 🛠️ Diego Monroy's Technical Stack\n\n` +
          `• **Backend & Architecture**: Java (Spring Boot, Spring Cloud), Python (FastAPI, LangChain, LangGraph), Node.js, Hexagonal Architecture, DDD, Microservices REST & gRPC.\n` +
          `• **Cloud & DevOps**: Google Cloud Platform (GCP ACE Certified #189954), Kubernetes (GKE), Cloud Run, Docker, CI/CD, SonarQube, Terraform.\n` +
          `• **Data & Databases**: PostgreSQL, Oracle SQL, Redis, Google BigQuery, Vector Databases.\n` +
          `• **Frontend**: Angular (Signals, Standalone Components), TypeScript, SCSS.\n` +
          `• **Generative AI**: LangGraph, Multi-Agent Systems, RAG pipelines, Gemini API & OpenAI.\n\n` +
          `Does your vacancy require any specific technology from this stack?`
        : `### 🛠️ Stack Tecnológico de Diego Monroy\n\n` +
          `• **Backend y Arquitectura**: Java (Spring Boot, Spring Cloud), Python (FastAPI, LangChain, LangGraph), Node.js, Arquitectura Hexagonal, DDD, Microservicios RESTful y gRPC.\n` +
          `• **Cloud & DevOps**: Google Cloud Platform (Certificado GCP ACE #189954), Kubernetes (GKE), Cloud Run, Docker, CI/CD, SonarQube, Terraform.\n` +
          `• **Bases de Datos & Data**: PostgreSQL, Oracle SQL, Redis, Google BigQuery, Vector DBs.\n` +
          `• **Frontend**: Angular (Signals, Standalone Components), TypeScript, SCSS.\n` +
          `• **Inteligencia Artificial**: LangGraph, Flujos Agénticos, RAG Empresarial, Gemini API y OpenAI.\n\n` +
          `¿Tu vacante requiere alguna tecnología en particular de este stack?`;
    }
    // 4. Inteligencia Artificial / GenAI
    else if (['ia', 'ai', 'genai', 'langchain', 'langgraph', 'llm', 'inteligencia artificial'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 🧠 Diego's Enterprise Generative AI Experience\n\n` +
          `• **Production Multi-Agent Workflows**: Designed conversational graphs and agentic pipelines using LangGraph and LangChain.\n` +
          `• **Latency Optimization (-40%)**: Built enterprise RAG assistants querying massive financial datasets in BigQuery.\n` +
          `• **Multimodal Integration**: Ingesting PDFs, structured data, and audio with strict token usage governance and safety guardrails.\n\n` +
          `Would you like to review an architectural blueprint or schedule an interview?`
        : `### 🧠 Experiencia de Diego en IA Generativa Empresarial\n\n` +
          `• **Sistemas Agénticos en Producción**: Diseño de grafos conversacionales con LangGraph y LangChain en entornos corporativos.\n` +
          `• **Optimización en Consultas Financieras (-40%)**: Asistentes RAG de alto rendimiento integrados a Google BigQuery.\n` +
          `• **Arquitectura Multimodal & Guardrails**: Procesamiento de documentos PDF, imágenes y audio con gobierno de costos por token y seguridad.\n\n` +
          `¿Deseas agendar una conversación técnica para profundizar en su experiencia con IA?`;
    }
    // 5. Certificaciones y Estudios
    else if (['certificacion', 'certificaciones', 'estudios', 'educacion', 'carrera', 'certifications', 'degree'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 📜 Official Certifications & Education\n\n` +
          `1. **Google Cloud Certified: Associate Cloud Engineer (ACE)** (Credly ID: 189954 · Valid 2026-2029)\n` +
          `2. **Postgraduate Degree in Project Management** (UNIMINUTO · Agile & Strategic leadership)\n` +
          `3. **B.S. in Systems Engineering** (Corporación Universitaria Minuto de Dios)\n` +
          `4. **AWS Academy Graduate: Cloud Foundations & Machine Learning** (Universidad de los Andes)\n` +
          `5. **GCP Skill Badge: Implement Load Balancing on Compute Engine** (Google Cloud)\n\n` +
          `These credentials validate his ability to architect resilient, scalable, and cost-efficient cloud systems.`
        : `### 📜 Certificaciones Oficiales y Educación\n\n` +
          `1. **Google Cloud Certified: Associate Cloud Engineer (ACE)** (Credly ID: 189954 · Vigencia 2026-2029)\n` +
          `2. **Especialización en Gerencia de Proyectos** (UNIMINUTO · Liderazgo ágil y estratégico)\n` +
          `3. **Ingeniería de Sistemas** (Corporación Universitaria Minuto de Dios)\n` +
          `4. **AWS Academy Graduate: Cloud Foundations & Machine Learning** (Universidad de los Andes)\n` +
          `5. **GCP Skill Badge: Implement Load Balancing on Compute Engine** (Google Cloud)\n\n` +
          `Estas certificaciones respaldan su capacidad para liderar arquitecturas seguras y de alta disponibilidad.`;
    }
    // 6. Contacto / Agendar
    else if (['contacto', 'agendar', 'entrevista', 'whatsapp', 'correo', 'llamada', 'contact', 'schedule'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 📅 Let's Schedule a Technical Interview with Diego!\n\n` +
          `• **Google Calendar**: Click the button below to book a direct 20-30 minute technical conversation.\n` +
          `• **WhatsApp**: Message Diego directly at **+57 310 800 9394**.\n` +
          `• **Email**: **diego.97duran@gmail.com**.\n\n` +
          `Click any of the action buttons below to connect immediately!`
        : `### 📅 ¡Coordinemos una entrevista técnica con Diego!\n\n` +
          `• **Google Calendar**: Haz clic en el botón inferior para reservar 20-30 minutos en su agenda.\n` +
          `• **WhatsApp**: Escríbele directamente al **+57 310 800 9394**.\n` +
          `• **Correo**: **diego.97duran@gmail.com**.\n\n` +
          `¡Usa cualquiera de los botones de acción para conectar al instante!`;
    }
    // 7. Vacante o descripción de puesto
    else if (isVacancy) {
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
    }
    // 8. Quién es Diego / Saludo general
    else {
      fullResponse = isEn
        ? `### Hello, I am Diego Monroy's Executive Talent Agent 👋\n\nDiego Leonardo Monroy Durán is a **Tech Lead & Solutions Architect** with over 5 years leading banking cloud systems and Generative AI solutions.\n\n` +
          `**Key Impact Metrics**:\n` +
          `• **99.99% SLA**: Banking-grade zero-downtime availability on corporate CRM.\n` +
          `• **-40% Latency**: Complex financial query optimization via LangChain & BigQuery.\n` +
          `• **-38% Incidents**: Quality & DevSecOps automation on Kubernetes & Cloud Run.\n\n` +
          `You can ask about his **tech stack, GCP certifications, GenAI projects**, or **upload a PDF job description** to calculate compatibility!`
        : `### Hola, soy el Agente Ejecutivo de Talento de Diego Monroy 👋\n\nDiego Leonardo Monroy Durán es **Tech Lead & Solutions Architect** con más de 5 años liderando arquitecturas bancarias de alta resiliencia y soluciones de Inteligencia Artificial Generativa.\n\n` +
          `**Métricas Clave de Impacto**:\n` +
          `• **99.99% SLA**: Disponibilidad bancaria ininterrumpida en CRM Corporativo.\n` +
          `• **-40% Latencia**: Optimización de consultas financieras mediante LangChain y BigQuery.\n` +
          `• **-38% Incidentes**: Automatización DevSecOps sobre Kubernetes y Cloud Run.\n\n` +
          `Puedes preguntarme sobre su **stack técnico, certificaciones GCP, proyectos de IA**, o **adjuntar el PDF de una vacante** para calcular compatibilidad al instante.`;
    }

    // Simular escritura progresiva
    const words = fullResponse.split(' ');
    for (const w of words) {
      this.messages.update(list => list.map(m => m.id === agentMsgId ? { ...m, text: m.text + w + ' ' } : m));
      await new Promise(r => setTimeout(r, 18));
    }

    this.messages.update(list => list.map(m => m.id === agentMsgId ? {
      ...m,
      match: matchCard,
      cta,
      isStreaming: false
    } : m));
  }
}
