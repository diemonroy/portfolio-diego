import { Component, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AiDashboardService, ConversationSummary } from '../../../core/services/ai-dashboard.service';

@Component({
  selector: 'app-ai-dashboard-modal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './ai-dashboard-modal.component.html',
  styleUrls: ['./ai-dashboard-modal.component.scss']
})
export class AiDashboardModalComponent {
  readonly dashboardService = inject(AiDashboardService);

  readonly isOpen = this.dashboardService.isOpen;
  readonly isLoading = this.dashboardService.isLoading;
  readonly stats = this.dashboardService.stats;
  readonly conversations = this.dashboardService.conversations;
  readonly selectedSession = this.dashboardService.selectedSession;
  readonly databaseStatus = this.dashboardService.databaseStatus;
  readonly skillsDemand = this.dashboardService.skillsDemand;
  readonly marketIntelligence = this.dashboardService.marketIntelligence;

  readonly activeTab = signal<'chats' | 'skills' | 'intel'>('chats');

  setTab(tab: 'chats' | 'skills' | 'intel'): void {
    this.activeTab.set(tab);
  }

  close(): void {
    this.dashboardService.closeDashboard();
  }

  refresh(): void {
    this.dashboardService.fetchData();
  }

  select(conv: ConversationSummary): void {
    this.dashboardService.selectSession(conv.sessionId);
  }

  copySessionTranscript(): void {
    const session = this.selectedSession();
    if (!session) return;

    let transcript = `--- Registro de Conversación (Sesión: ${session.sessionId}) ---\n`;
    transcript += `Fecha: ${session.createdAt}\n`;
    transcript += `Rol Detectado: ${session.roleDetected || 'Consulta General'}\n`;
    transcript += `Match: ${session.matchScore || 0}%\n\n`;

    session.messages.forEach(m => {
      const author = m.sender === 'user' ? 'RECLUTADOR' : 'DIEGO MONROY';
      transcript += `[${m.timestamp}] ${author}:\n${m.content}\n\n`;
    });

    navigator.clipboard.writeText(transcript);
    alert('¡Transcripción copiada al portapapeles!');
  }
}
