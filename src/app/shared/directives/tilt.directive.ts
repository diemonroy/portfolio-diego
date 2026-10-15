import { Directive, ElementRef, HostListener, Input, Renderer2, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective implements AfterViewInit {
  @Input() tiltAmount = 15; // Max tilt rotation in degrees
  @Input() scale = 1.05;

  private isMobile = false;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (!this.isMobile) {
      this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.1s ease-out');
      this.renderer.setStyle(this.el.nativeElement, 'transform-style', 'preserve-3d');
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isMobile) return;
    
    const element = this.el.nativeElement;
    const rect = element.getBoundingClientRect();
    
    const x = event.clientX - rect.left; // x position within the element.
    const y = event.clientY - rect.top;  // y position within the element.
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = ((y - centerY) / centerY) * -this.tiltAmount;
    const rotateY = ((x - centerX) / centerX) * this.tiltAmount;

    this.renderer.setStyle(element, 'transform', `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${this.scale}, ${this.scale}, ${this.scale})`);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    if (this.isMobile) return;
    
    this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.5s ease-out');
    this.renderer.setStyle(this.el.nativeElement, 'transform', `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);
    
    setTimeout(() => {
      this.renderer.setStyle(this.el.nativeElement, 'transition', 'transform 0.1s ease-out');
    }, 500);
  }
}
