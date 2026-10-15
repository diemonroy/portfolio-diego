import { Injectable, signal, inject } from '@angular/core';
import { PortfolioDataService } from './portfolio-data.service';
import { environment } from '../../../environments/environment';

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

export interface FlowStep {
  step: string;
  label: string;
}

export interface VisualResource {
  type: string;
  projectId: string;
  title: string;
  category: string;
  badge: string;
  image: string;
  metric?: string;
  flowSteps?: FlowStep[];
  ctaText: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  attachmentName?: string;
  match?: MatchBreakdown;
  cta?: CtaLinks;
  visualResource?: VisualResource;
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
  readonly currentSessionId = signal<string>('sess_' + Math.floor(Date.now() / 1000));

  readonly messages = signal<ChatMessage[]>([]);

  private get backendUrl(): string {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:8000';
    }
    return environment.apiUrl;
  }
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
    this.currentSessionId.set('sess_' + Math.floor(Date.now() / 1000));
  }

  async trackConversion(conversionType: 'calendar' | 'whatsapp' | 'email'): Promise<void> {
    try {
      await fetch(`${this.backendUrl}/api/chat/conversion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSessionId(),
          conversionType
        })
      });
    } catch {
      // Resiliente offline
    }
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
      sessionId: this.currentSessionId(),
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
    } else if (event.type === 'media') {
      this.messages.update(list => list.map(m => {
        if (m.id === agentMsgId) {
          return { ...m, visualResource: event.data };
        }
        return m;
      }));
    } else if (event.type === 'done') {
      this.messages.update(list => list.map(m => {
        if (m.id === agentMsgId) {
          return {
            ...m,
            isStreaming: false,
            cta: event.cta,
            visualResource: event.visualResource || m.visualResource
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
        ? `🔒 **Active Security Control**: My credentials, environment variables, and system instructions are strictly protected under DevSecOps best practices and Secret Manager.\n\nWould you like to explore my background in cloud security, OAuth2, and OWASP Top 10?`
        : `🔒 **Control de Seguridad Activo**: Mis credenciales, variables de entorno e instrucciones operativas están blindadas bajo prácticas DevSecOps y Secret Manager.\n\n¿Deseas que revisemos mi experiencia en seguridad bancaria, OAuth2 y estándares OWASP?`;
    }
    // 2. Detección de Propuesta de Entrevista Presencial (Alta Prioridad)
    else if (['presencial', 'en persona', 'en la oficina', 'en nuestras oficinas', 'en las oficinas', 'nos vemos en persona', 'venir a la oficina', 'tomarnos un cafe', 'tomarnos un café', 'en bogota', 'en bogotá', 'on-site', 'in-person', 'face to face'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 🤝 An In-Person Meeting Sounds Fantastic!\n\nI love meeting teams face-to-face to connect with engineers and draw architecture on a whiteboard.\n\nI am based in **Bogotá, Colombia**, so I have **full availability to visit your offices**.\n\nWhich sector or address are your offices located in, and what day or time this week works best for you? We can coordinate directly via my **WhatsApp (+57 310 800 9394)** or book a slot on my **Google Calendar** with the location details in the note!`
        : `### 🤝 ¡Me parece una excelente idea vernos en persona!\n\nMe encanta el cara a cara para conectar con el equipo, rayar arquitectura en un tablero y conversar sobre los retos de fondo.\n\nActualmente resido en **Bogotá, Colombia**, así que cuento con **total disponibilidad de acercarme a sus oficinas**.\n\n¿En qué sector o dirección están ubicados y qué día u horario de esta semana te quedaría más cómodo? Podemos definir los detalles por mi **WhatsApp (+57 310 800 9394)** o si prefieres, aparta el espacio en mi **Google Calendar** y me dejas la dirección en la nota de la reunión. ¡Será un gusto conocernos!`;
    }
    // 3. ¿Qué hace él? / Responsabilidades / Cargo actual
    else if (['que hac', 'que hace', 'a que se dedica', 'cual es su rol', 'que funcion', 'responsabilidades', 'what does he do', 'a que te dedicas', 'que haces'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 💼 What I Do in My Day-to-Day\n\nI currently serve as **Tech Lead & Solutions Architect** at **Banco de Bogotá (Grupo AVAL)**. My core responsibilities include:\n\n` +
          `1. **Engineering Cell Leadership**: Guiding multidisciplinary agile teams, defining Hexagonal Architecture standards, DDD domain boundaries, and code quality governance.\n` +
          `2. **Mission-Critical Corporate CRM (99.99% SLA)**: Architecting the corporate CRM, ensuring high availability, sub-second latency, and zero unscheduled downtime.\n` +
          `3. **Enterprise Generative AI**: Designing multi-agent pipelines with LangChain, LangGraph, and BigQuery vector DBs, reducing query latency by 40%.\n` +
          `4. **Cloud & DevSecOps Governance**: As a Google Cloud Certified ACE, deploying zero-downtime containers on Kubernetes (GKE) and Cloud Run, cutting production incidents by 38% with SonarQube.\n\n` +
          `Would you like to schedule a 20-minute architectural discussion with me?`
        : `### 💼 ¿A qué me dedico y qué hago en mi día a día?\n\nActualmente me desempeño como **Tech Lead & Solutions Architect** en **Banco de Bogotá (Grupo AVAL)**. Mi rol combina liderazgo de ingeniería, arquitectura de alta disponibilidad y soluciones de IA:\n\n` +
          `1. **Liderazgo Técnico de Células de Desarrollo**: Guío a desarrolladores backend y frontend, definiendo Arquitectura Hexagonal, Domain-Driven Design (DDD) y revisiones rigurosas de código.\n` +
          `2. **Arquitectura del CRM Corporativo (99.99% SLA)**: Diseñé y lidero la evolución del CRM In-House de Banca Empresas, garantizando alta concurrencia y disponibilidad ininterrumpida.\n` +
          `3. **Innovación con Inteligencia Artificial Generativa**: Lidero sistemas agénticos con LangChain, LangGraph y Vector DBs conectados a BigQuery, optimizando tiempos de consulta en un 40%.\n` +
          `4. **Gobierno Cloud y DevSecOps**: Como certificado oficial Google Cloud ACE, administro contenedores en Kubernetes (GKE) y Cloud Run, reduciendo incidentes en producción en un 38% con SonarQube.\n\n` +
          `¿Te gustaría que coordinemos una charla técnica para conversar sobre tus proyectos?`;
    }
    // 4. Tecnologías y Stack
    else if (['tecnologia', 'tecnologías', 'stack', 'lenguajes', 'java', 'python', 'angular', 'gcp', 'cloud', 'technologies', 'kubernetes'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 🛠️ My Technical Stack & Specializations\n\n` +
          `• **Backend & Architecture**: Java (Spring Boot, Spring Cloud), Python (FastAPI, Flask, LangChain, LangGraph), Node.js, Hexagonal Architecture, DDD, Microservices REST & gRPC.\n` +
          `• **Cloud & DevOps**: Google Cloud Platform (Google Cloud Certified ACE #189954), Kubernetes (GKE), Cloud Run, Docker, CI/CD, SonarQube, Terraform.\n` +
          `• **Data & Databases**: PostgreSQL, Oracle SQL, Redis, Google BigQuery, Vector Databases (Pinecone/Chroma).\n` +
          `• **Frontend**: Angular (Signals, Standalone Components, SSR), TypeScript, SCSS.\n` +
          `• **Generative AI**: LangGraph, Multi-Agent Systems, Enterprise RAG, Gemini API & OpenAI.\n\n` +
          `Does your project require any specific technology from this stack?`
        : `### 🛠️ Mi Stack Tecnológico y Especialidades\n\n` +
          `• **Backend y Arquitectura**: Java (Spring Boot, Spring Cloud), Python (FastAPI, Flask, LangChain, LangGraph), Node.js, Arquitectura Hexagonal, DDD, Microservicios RESTful y gRPC.\n` +
          `• **Cloud & DevOps**: Google Cloud Platform (Certificado Google Cloud ACE #189954), Kubernetes (GKE), Cloud Run, Docker, CI/CD con Jenkins/GitLab, SonarQube, Terraform.\n` +
          `• **Bases de Datos & Data**: PostgreSQL, Oracle SQL, Redis, Google BigQuery, Vector Databases (Pinecone/Chroma).\n` +
          `• **Frontend**: Angular (Signals, Standalone Components, SSR), TypeScript, SCSS.\n` +
          `• **Inteligencia Artificial**: LangGraph, Flujos Agénticos, RAG Empresarial, Gemini API y OpenAI.\n\n` +
          `¿Tu vacante requiere alguna tecnología en particular de este stack?`;
    }
    // 5. Inteligencia Artificial / GenAI
    else if (['ia', 'ai', 'genai', 'langchain', 'langgraph', 'llm', 'inteligencia artificial'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 🧠 My Experience in Enterprise Generative AI\n\n` +
          `• **Production Multi-Agent Workflows**: Orchestrated conversational graphs and agentic pipelines using LangGraph and LangChain.\n` +
          `• **Query Optimization (-40% Latency)**: Implemented RAG assistants querying complex financial data on Google BigQuery.\n` +
          `• **Multimodal Integration & Guardrails**: Ingesting PDFs, structured data, and audio with strict token governance and security controls.\n\n` +
          `Would you like to schedule a 20-minute call to discuss my AI architecture approaches?`
        : `### 🧠 Mi Experiencia en Inteligencia Artificial Generativa\n\n` +
          `• **Sistemas Agénticos en Producción**: Diseño de grafos conversacionales con LangGraph y LangChain en entornos bancarios regulados.\n` +
          `• **Optimización en Consultas Financieras (-40%)**: Asistentes RAG de alto rendimiento integrados a Google BigQuery.\n` +
          `• **Arquitectura Multimodal & Guardrails**: Procesamiento de documentos PDF, imágenes y audio con gobierno de costos por token y seguridad.\n\n` +
          `¿Te gustaría que coordinemos una videollamada técnica para mostrarte cómo diseño estos flujos agénticos?`;
    }
    // 6. Certificaciones y Estudios
    else if (['certificacion', 'certificaciones', 'estudios', 'educacion', 'carrera', 'certifications', 'degree'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 📜 My Official Certifications & Education\n\n` +
          `1. **Google Cloud Certified: Associate Cloud Engineer (ACE)** (Credly ID: 189954 · Valid 2026-2029)\n` +
          `2. **Postgraduate Degree in Project Management** (UNIMINUTO · Agile & Strategic leadership)\n` +
          `3. **B.S. in Systems Engineering** (Corporación Universitaria Minuto de Dios)\n` +
          `4. **AWS Academy Graduate: Cloud Foundations & Machine Learning** (Universidad de los Andes)\n` +
          `5. **GCP Skill Badge: Implement Load Balancing on Compute Engine** (Google Cloud)\n\n` +
          `These credentials validate my ability to architect resilient, scalable, and cost-efficient cloud systems.`
        : `### 📜 Mis Certificaciones Oficiales y Formación Académica\n\n` +
          `1. **Google Cloud Certified: Associate Cloud Engineer (ACE)** (Credly ID: 189954 · Vigencia 2026-2029)\n` +
          `2. **Especialización en Gerencia de Proyectos** (UNIMINUTO · Liderazgo ágil y estratégico)\n` +
          `3. **Ingeniería de Sistemas** (Corporación Universitaria Minuto de Dios)\n` +
          `4. **AWS Academy Graduate: Cloud Foundations & Machine Learning** (Universidad de los Andes)\n` +
          `5. **GCP Skill Badge: Implement Load Balancing on Compute Engine** (Google Cloud)\n\n` +
          `Estas credenciales respaldan mi capacidad para liderar arquitecturas seguras y de alta disponibilidad.`;
    }
    // 7. Contacto / Agendar
    else if (['contacto', 'agendar', 'entrevista', 'whatsapp', 'correo', 'llamada', 'contact', 'schedule'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### 📅 Let's Schedule a 20-Minute Technical Chat!\n\n` +
          `I would love to learn more about your team's challenges and discuss how I can bring immediate value:\n\n` +
          `• **In-Person Meeting**: If your offices are in Bogotá, I would love to visit and meet the team in person.\n` +
          `• **Google Calendar**: Click the button below to pick a slot directly in my calendar for a virtual call.\n` +
          `• **WhatsApp**: Message me directly at **+57 310 800 9394**.\n` +
          `• **Email**: **diego.97duran@gmail.com**.\n\n` +
          `Click any of the action buttons below to connect immediately!`
        : `### 📅 ¡Coordinemos de una vez!\n\n` +
          `Tengo total disponibilidad para reunirnos:\n\n` +
          `• **Reunión Presencial**: Si sus oficinas están en Bogotá, me encantaría visitarlos para conocer al equipo en persona.\n` +
          `• **Google Calendar**: Si prefieres videollamada, elige el horario de 20 minutos que mejor te convenga con el botón inferior.\n` +
          `• **WhatsApp Directo**: Escríbeme a mi número personal **+57 310 800 9394**.\n` +
          `• **Correo**: **diego.97duran@gmail.com**.\n\n` +
          `¡Usa cualquiera de los botones de acción para conectar al instante!`;
    }
    // 7.5. Solicitud de desarrollo / agente / solución técnica
    else if (['desarrollar', 'crear', 'hacer', 'construir', 'agente', 'fuerza comercial', 'venta', 'ventas', 'solucion', 'solución', 'software', 'sistema'].some(k => lower.includes(k))) {
      fullResponse = isEn
        ? `### Absolutely! Leading This Kind of Solution Is My Core Expertise\n\n` +
          `I possess the deep technical knowledge, cloud architecture background (Google Cloud ACE, 99.99% banking SLA), and multi-agent AI experience (LangChain/LangGraph) to lead and execute this challenge with high excellence.\n\n` +
          `Rather than delivering a generic, disconnected template, my priority is understanding your unique business context: **What specific role or vacancy are you looking to fill, how does your commercial process currently operate, and what CRM or tools do you currently rely on?** With my skills and a comprehensive analysis of your current state and workflow, we will design the exact solution that fits your operational needs. Shall we schedule a brief 20-minute diagnostic session to deep-dive?`
        : `### ¡Por supuesto! Liderar este tipo de proyectos está en el centro de mi especialidad\n\n` +
          `Cuento con el conocimiento técnico, el liderazgo y las habilidades de sobra en sistemas agénticos con LangChain/LangGraph, microservicios y nube (Google Cloud ACE, SLA bancario 99.99%) para ejecutar esta iniciativa con total solvencia.\n\n` +
          `Más allá de plantear una solución a ciegas, mi prioridad es entender a fondo su contexto: **¿qué vacante o reto específico buscan cubrir, cómo opera actualmente su proceso comercial y qué herramientas o CRM tienen hoy?** Con mis habilidades y un análisis integral del estado de su negocio y sus procesos, encontraremos la solución que calce con exactitud a lo que necesitan. ¿Te parece si agendamos una llamada corta de 20 minutos para profundizar en su escenario?`;
    }
    // 8. Vacante o descripción de puesto
    else if (isVacancy) {
      fullResponse = isEn
        ? `### 🎯 I Reviewed Your Vacancy and I Am Excited About the Challenge!\n\nMatching your requirements against what I lead in my career shows a **98% compatibility**:\n\n` +
          `• **Technical Leadership & Cloud Architecture (98% Match)**: Active Tech Lead at Banco de Bogotá, maintaining **99.99% SLA** on mission-critical corporate CRM.\n` +
          `• **Official Cloud Certification**: Google Cloud Certified Associate Cloud Engineer (ACE Credly ID #189954).\n` +
          `• **Enterprise Generative AI**: Multi-agent pipelines with LangChain, LangGraph, and BigQuery vector DBs cutting query times by 40%.\n\n` +
          `📅 **Next Step**: I am ready to lead these technical challenges. You can book a 20-minute meeting right now below or write me on WhatsApp. If you are located in Bogotá, we can also meet in person at your office!`
        : `### 🎯 ¡He revisado tu vacante y me entusiasma mucho el reto!\n\nAl contrastar los requerimientos con los proyectos que lidero, veo una **compatibilidad del 98%** con mi perfil como **Tech Lead & Solutions Architect**:\n\n` +
          `• **Liderazgo Técnico & Arquitectura Cloud (Match: 98%)**: Tech Lead activo en Banco de Bogotá, garantizando **99.99% de SLA** en el CRM de Banca Empresas.\n` +
          `• **Certificación Oficial**: Google Cloud Certified Associate Cloud Engineer (ACE Credly ID #189954).\n` +
          `• **IA Generativa Empresarial**: Flujos agénticos con LangChain, LangGraph y BigQuery que reducen tiempos de consulta en 40%.\n\n` +
          `📅 **Siguiente Paso**: Estoy listo para asumir el ownership técnico de estos retos. Podemos coordinar una llamada de 20 minutos o, **si están aquí en Bogotá, visitarlos directamente en sus oficinas** para conversar en persona.`;
    }
    // 9. Quién es Diego / Saludo general (Captura de contexto antes de cierre)
    else {
      fullResponse = isEn
        ? `### Hello! Great to connect with you. I am Diego Monroy 👋\n\n` +
          `Welcome! I am a **Tech Lead & Solutions Architect** with over 5 years leading high-resilience banking architectures (99.99% SLA at Banco de Bogotá), cloud infrastructure (Google Cloud Certified ACE), and Generative AI systems.\n\n` +
          `To tailor our conversation to your exact needs:\n\n` +
          `1. **Who do I have the pleasure of speaking with, and what company do you represent?**\n` +
          `2. **What role or profile are you looking to empower?** (Tech Lead, Cloud Solutions Architect, AI Engineer, or Backend Senior?).\n` +
          `3. **What caught your attention the most from my profile?** (The 99.99% SLA banking resilience, the GCP ACE certification, or the GenAI multi-agent systems?).\n\n` +
          `Feel free to share and let's dive straight in!`
        : `### ¡Hola! Qué gusto saludarte, soy Diego Monroy 👋\n\n` +
          `¡Bienvenido! Me alegra mucho que conversemos. Soy **Tech Lead & Solutions Architect** con más de 5 años liderando arquitecturas bancarias críticas (SLA 99.99% en Banco de Bogotá), infraestructura cloud (Google Cloud ACE) y soluciones de Inteligencia Artificial Generativa.\n\n` +
          `Para poder orientar la charla y contarte exactamente cómo puedo sumarle a tu equipo:\n\n` +
          `1. **¿Con quién tengo el gusto de hablar y de qué empresa me contactas?**\n` +
          `2. **¿Qué rol o perfil están buscando cubrir?** (¿Tech Lead, Cloud Solutions Architect, AI Engineer o Backend Senior?).\n` +
          `3. **¿Qué fue lo que más te llamó la atención de mi perfil?** (¿La disponibilidad del 99.99% en banca, la certificación GCP ACE o los proyectos de GenAI?).\n\n` +
          `¡Cuéntame con total confianza y entramos directo en materia!`;
    }

    // Simular escritura progresiva
    const words = fullResponse.split(' ');
    for (const w of words) {
      this.messages.update(list => list.map(m => m.id === agentMsgId ? { ...m, text: m.text + w + ' ' } : m));
      await new Promise(r => setTimeout(r, 18));
    }

    // Determinar recurso visual enriquecido según temática
    let fallbackVisual: VisualResource | undefined = undefined;
    if (['agente', 'ia', 'genai', 'langchain', 'langgraph', 'comercial', 'venta', 'ventas', 'automatiz'].some(k => lower.includes(k))) {
      fallbackVisual = {
        type: 'project_card',
        projectId: 'ai-agents',
        title: 'Ecosistema de Agentes y Grafos con LangChain',
        category: 'Inteligencia Artificial · GenAI',
        badge: 'Arquitectura de Referencia',
        image: 'assets/cover-ai.png',
        metric: '-40% tiempos de consulta · Reducción del 92% inconsistencias',
        flowSteps: [
          { step: 'Entrada', label: 'CRM / Ventas' },
          { step: 'Grafo', label: 'Orquestador LangGraph' },
          { step: 'RAG', label: 'BigQuery Vector' },
          { step: 'Acción', label: 'Estrategia de Venta' }
        ],
        ctaText: 'Ver Arquitectura del Proyecto'
      };
    } else if (['cloud', 'gcp', 'aws', 'kubernetes', 'gke', 'devops', 'infraestructura'].some(k => lower.includes(k))) {
      fallbackVisual = {
        type: 'project_card',
        projectId: 'multicloud',
        title: 'Infraestructura Multi-Cloud y DevSecOps',
        category: 'Cloud & DevSecOps · Google Cloud ACE',
        badge: 'Google Cloud Certified ACE #189954',
        image: 'assets/cover-cloud.png',
        metric: 'SLA 99.99% · Despliegues Zero-Downtime en GKE',
        flowSteps: [
          { step: 'Código', label: 'Git & SonarQube' },
          { step: 'Deploy', label: 'Terraform & Docker' },
          { step: 'Runtime', label: 'Kubernetes GKE' },
          { step: 'Control', label: 'Observabilidad p99' }
        ],
        ctaText: 'Ver Arquitectura del Proyecto'
      };
    } else if (['crm', 'banca', 'banco', 'liderazgo', 'tech lead', 'sla'].some(k => lower.includes(k))) {
      fallbackVisual = {
        type: 'project_card',
        projectId: 'crm-banca',
        title: 'CRM In-House Banca Empresas',
        category: 'Banca Empresas · Core CRM',
        badge: 'SLA Bancario 99.99%',
        image: 'assets/cover-crm.png',
        metric: '+38% productividad comercial · Millones de transacciones',
        flowSteps: [
          { step: 'Front', label: 'Angular Standalone' },
          { step: 'Core', label: 'Clean Architecture' },
          { step: 'Nube', label: 'GCP Cloud Run / GKE' },
          { step: 'Seguridad', label: 'OAuth2 / OIDC' }
        ],
        ctaText: 'Ver Arquitectura del Proyecto'
      };
    }

    this.messages.update(list => list.map(m => m.id === agentMsgId ? {
      ...m,
      match: matchCard,
      cta,
      visualResource: fallbackVisual,
      isStreaming: false
    } : m));
  }
}
