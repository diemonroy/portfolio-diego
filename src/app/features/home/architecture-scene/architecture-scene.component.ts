import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  inject,
  PLATFORM_ID,
  ChangeDetectionStrategy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface SculpturePalette {
  silver: string;
  graphite: string;
  light: string;
}

@Component({
  selector: 'app-architecture-scene',
  standalone: true,
  templateUrl: './architecture-scene.component.html',
  styleUrl: './architecture-scene.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchitectureSceneComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true })
  private containerRef!: ElementRef<HTMLDivElement>;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private sculptureGroup!: THREE.Group;
  private knotMesh!: THREE.Mesh;
  private ringMesh!: THREE.Mesh;
  private clock = new THREE.Clock();
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueryList: MediaQueryList | null = null;
  private reducedMotion = false;
  private pointerY = 0;
  private targetPointerY = 0;

  // Listeners
  private onPointerMoveBound = this.onPointerMove.bind(this);
  private onMediaChangeBound = this.onMediaChange.bind(this);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initScene();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.mediaQueryList && this.onMediaChangeBound) {
      this.mediaQueryList.removeEventListener('change', this.onMediaChangeBound);
    }

    if (this.containerRef?.nativeElement) {
      this.containerRef.nativeElement.removeEventListener('pointermove', this.onPointerMoveBound);
    }

    if (this.controls) {
      this.controls.dispose();
    }

    if (this.knotMesh) {
      this.knotMesh.geometry.dispose();
      (this.knotMesh.material as THREE.Material).dispose();
    }

    if (this.ringMesh) {
      this.ringMesh.geometry.dispose();
      (this.ringMesh.material as THREE.Material).dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
    }
  }

  private resolvePalette(): SculpturePalette {
    if (typeof window === 'undefined') {
      return { silver: '#e2e8f0', graphite: '#38bdf8', light: '#ffffff' };
    }

    const css = getComputedStyle(document.documentElement);

    const resolve = (token: string, fallback: string): string => {
      const val = css.getPropertyValue(token).trim();
      if (!val) return fallback;

      const probe = document.createElement('span');
      probe.style.color = val;
      document.body.append(probe);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        probe.remove();
        return new THREE.Color(fallback).getStyle();
      }

      ctx.fillStyle = getComputedStyle(probe).color;
      ctx.fillRect(0, 0, 1, 1);
      const pixel = ctx.getImageData(0, 0, 1, 1).data;
      probe.remove();

      return new THREE.Color()
        .setRGB((pixel[0] ?? 0) / 255, (pixel[1] ?? 0) / 255, (pixel[2] ?? 0) / 255)
        .getStyle();
    };

    return {
      silver: resolve('--sculpture-silver', '#d4d4d8'),
      graphite: resolve('--sculpture-graphite', '#38bdf8'),
      light: resolve('--sculpture-light', '#ffffff')
    };
  }

  private initScene(): void {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth || 580;
    const height = container.clientHeight || 580;

    // Palette & Accessibility
    const palette = this.resolvePalette();
    this.mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.mediaQueryList.matches;
    this.mediaQueryList.addEventListener('change', this.onMediaChangeBound);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 6.8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // Studio Environment Reflections via RoomEnvironment & PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // Lighting (matches R3F setup: ambient + directional + lightformer equivalents)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(new THREE.Color(palette.light), 2.2);
    mainDirLight.position.set(3, 5, 4);
    this.scene.add(mainDirLight);

    // Lightformers positions: [0, 4, 2], [-4, 0, 1], [4, -1, 2]
    const lightformer1 = new THREE.DirectionalLight(new THREE.Color(palette.light), 2.5);
    lightformer1.position.set(0, 4, 2);
    this.scene.add(lightformer1);

    const lightformer2 = new THREE.DirectionalLight(new THREE.Color(palette.light), 1.8);
    lightformer2.position.set(-4, 0, 1);
    this.scene.add(lightformer2);

    const lightformer3 = new THREE.DirectionalLight(new THREE.Color(palette.light), 1.4);
    lightformer3.position.set(4, -1, 2);
    this.scene.add(lightformer3);

    // Sculpture Group
    this.sculptureGroup = new THREE.Group();
    this.sculptureGroup.rotation.set(0, -0.35, 0.18);

    // 1. Torus Knot Mesh (Silver)
    const knotGeo = new THREE.TorusKnotGeometry(1.05, 0.28, 192, 24, 2, 3);
    const knotMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.silver),
      metalness: 0.97,
      roughness: 0.22,
      clearcoat: 0.8,
      clearcoatRoughness: 0.15
    });
    this.knotMesh = new THREE.Mesh(knotGeo, knotMat);
    this.knotMesh.rotation.set(0.25, 0.3, 0);
    this.sculptureGroup.add(this.knotMesh);

    // 2. Torus Ring Mesh (Graphite)
    const ringGeo = new THREE.TorusGeometry(1.93, 0.025, 12, 128);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.graphite),
      metalness: 0.85,
      roughness: 0.3
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.rotation.set(Math.PI / 2.8, -0.4, 0.25);
    this.sculptureGroup.add(this.ringMesh);

    this.scene.add(this.sculptureGroup);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = Math.PI / 3;
    this.controls.maxPolarAngle = (Math.PI * 2) / 3;

    // Events
    container.addEventListener('pointermove', this.onPointerMoveBound, { passive: true });

    // Resize handling
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;
        if (newWidth > 0 && newHeight > 0) {
          this.camera.aspect = newWidth / newHeight;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(newWidth, newHeight);
        }
      }
    });
    this.resizeObserver.observe(container);

    // Animation loop outside Angular Zone to ensure maximum 60+ FPS
    this.ngZone.runOutsideAngular(() => {
      this.clock.start();
      this.animate();
    });
  }

  private onPointerMove(event: PointerEvent): void {
    const container = this.containerRef.nativeElement;
    const rect = container.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    this.targetPointerY = -y;
  }

  private onMediaChange(e: MediaQueryListEvent): void {
    this.reducedMotion = e.matches;
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const rawDelta = this.clock.getDelta();
    const delta = Math.min(rawDelta, 0.05);

    if (this.sculptureGroup) {
      if (!this.reducedMotion) {
        this.sculptureGroup.rotation.y += delta * 0.12;
      }
      const target = this.targetPointerY * 0.12;
      this.sculptureGroup.rotation.x += (target - this.sculptureGroup.rotation.x) * (1 - Math.exp(-3 * delta));
    }

    if (this.controls) {
      this.controls.update();
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
