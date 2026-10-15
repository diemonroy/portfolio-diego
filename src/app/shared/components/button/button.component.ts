import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() fullWidth: boolean = false;
  @Input() disabled: boolean = false;
  @Input() href?: string;
  @Input() target?: string;
  @Input() rel?: string;
  @Input() download?: string | boolean;
  @Input() ariaLabel?: string;
  @Input() title?: string;
  @Input() customClass: string = '';

  @Output() buttonClick = new EventEmitter<MouseEvent>();

  get classes(): string {
    const classList = [
      'app-btn',
      `app-btn--${this.variant}`,
      `app-btn--${this.size}`,
    ];

    if (this.fullWidth) {
      classList.push('app-btn--full');
    }

    if (this.disabled) {
      classList.push('app-btn--disabled');
    }

    if (this.customClass) {
      classList.push(this.customClass);
    }

    return classList.join(' ');
  }

  get computedRel(): string | undefined {
    if (this.rel) return this.rel;
    if (this.target === '_blank') return 'noopener noreferrer';
    return undefined;
  }

  onClick(event: MouseEvent): void {
    if (this.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.buttonClick.emit(event);
  }
}
