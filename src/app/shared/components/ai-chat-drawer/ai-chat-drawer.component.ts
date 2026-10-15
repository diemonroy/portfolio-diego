import { Component, inject, signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiAgentService, ChatMessage } from '../../../core/services/ai-agent.service';
import { AiDashboardService } from '../../../core/services/ai-dashboard.service';
import { PortfolioDataService } from '../../../core/services/portfolio-data.service';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-ai-chat-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  templateUrl: './ai-chat-drawer.component.html',
  styleUrls: ['./ai-chat-drawer.component.scss']
})
export class AiChatDrawerComponent implements AfterViewChecked {
  readonly aiService = inject(AiAgentService);
  readonly dashboardService = inject(AiDashboardService);
  readonly portfolioDataService = inject(PortfolioDataService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef;
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>;

  inputText = signal<string>('');
  readonly currentlyPlayingId = signal<string | null>(null);
  private shouldScrollBottom = false;

  suggestedChips = [
    { label: '📄 Subir PDF de mi vacante', action: 'upload', query: '' },
    { label: '🚀 ¿Por qué Diego para Tech Lead?', action: 'query', query: '¿Por qué Diego es el candidato idóneo para Tech Lead o Arquitecto de Software?' },
    { label: '🧠 Experiencia en GenAI & LangGraph', action: 'query', query: '¿Qué experiencia comprobada tiene Diego en Inteligencia Artificial Generativa y flujos con LangGraph?' },
    { label: '🏦 Métricas de impacto bancario (SLA 99.99%)', action: 'query', query: 'Cuéntame sobre el 99.99% de SLA y cómo Diego redujo incidentes en producción un 38%.' },
    { label: '📅 Agendar entrevista técnica directa', action: 'query', query: 'Quiero agendar una entrevista técnica con Diego esta semana.' }
  ];

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }

  handleChipClick(chip: { action: string; query: string }): void {
    if (chip.action === 'upload') {
      this.fileInput?.nativeElement.click();
    } else {
      this.inputText.set(chip.query);
      this.sendMessage();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.aiService.attachFile(file);
      input.value = '';
    }
  }

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  toggleVoiceInput(): void {
    if (this.aiService.isRecordingVoice()) {
      this.aiService.stopVoiceInput();
    } else {
      this.aiService.startVoiceInput((transcript) => {
        this.inputText.update(current => (current ? current + ' ' : '') + transcript);
      });
    }
  }

  sendMessage(): void {
    const text = this.inputText().trim();
    if (!text && !this.aiService.attachedFile()) return;

    this.inputText.set('');
    this.shouldScrollBottom = true;
    this.aiService.sendUserMessage(text);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatMarkdown(text: string): string {
    if (!text) return '';
    // Formateo ligero y seguro para negritas, viñetas y títulos
    let formatted = text
      .replace(/### (.*?)\n/g, '<h4 class="md-h4">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/• (.*?)\n/g, '<li class="md-li">$1</li>')
      .replace(/- (.*?)\n/g, '<li class="md-li">$1</li>');

    formatted = formatted.replace(/\n\n/g, '<br/><br/>').replace(/\n/g, '<br/>');
    return formatted;
  }

  openDashboard(): void {
    this.dashboardService.openDashboard();
  }

  onCtaClick(type: 'calendar' | 'whatsapp' | 'email'): void {
    this.aiService.trackConversion(type);
  }

  openProject(projectId: string): void {
    this.portfolioDataService.openProjectById(projectId);
  }

  toggleAudio(msg: ChatMessage): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    // Si ya está reproduciendo este mensaje, pausar o detener
    if (this.currentlyPlayingId() === msg.id) {
      window.speechSynthesis.cancel();
      this.currentlyPlayingId.set(null);
      return;
    }

    // Cancelar cualquier audio anterior
    window.speechSynthesis.cancel();

    // Limpiar texto para una narración fluida y natural (eliminar markdown y URLs)
    const cleanText = (msg.text || '')
      .replace(/### (.*?)\n/g, '$1. ')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/•/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/<[^>]*>/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-CO';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Buscar la mejor voz en español disponible
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(v => v.lang === 'es-CO') ||
                         voices.find(v => v.lang === 'es-419') ||
                         voices.find(v => v.lang.startsWith('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    utterance.onstart = () => {
      this.currentlyPlayingId.set(msg.id);
    };

    utterance.onend = () => {
      this.currentlyPlayingId.set(null);
    };

    utterance.onerror = () => {
      this.currentlyPlayingId.set(null);
    };

    window.speechSynthesis.speak(utterance);
  }
}
