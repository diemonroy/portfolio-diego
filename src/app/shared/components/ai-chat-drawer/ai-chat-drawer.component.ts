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
}
