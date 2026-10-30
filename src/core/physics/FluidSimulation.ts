/**
 * KALINAR 2D NAVIER-STOKES FLUID SIMULATION (v0.2.0-alpha)
 * GPU Ping-Pong RenderTargets (256x256 Velocity / 512x512 Density)
 * Strictly Zero Emojis
 */

import * as THREE from 'three';

export interface FluidSimulationConfig {
  renderer: THREE.WebGLRenderer;
  velocityResolution?: number;
  densityResolution?: number;
  viscosity?: number;
  decayRate?: number;
}

export class FluidSimulation {
  private renderer: THREE.WebGLRenderer;
  private velocityResolution: number;
  private densityResolution: number;
  private decayRate: number;

  private velocityPing: THREE.WebGLRenderTarget;
  private velocityPong: THREE.WebGLRenderTarget;
  private densityPing: THREE.WebGLRenderTarget;
  private densityPong: THREE.WebGLRenderTarget;

  private camera: THREE.OrthographicCamera;
  private quadGeometry: THREE.PlaneGeometry;

  private advectionMaterial: THREE.ShaderMaterial;
  private splatMaterial: THREE.ShaderMaterial;
  private decayMaterial: THREE.ShaderMaterial;

  private isReducedMotion: boolean = false;

  constructor(config: FluidSimulationConfig) {
    this.renderer = config.renderer;
    this.velocityResolution = config.velocityResolution || 256;
    this.densityResolution = config.densityResolution || 512;
    this.decayRate = config.decayRate || 0.985; // Decays back to equilibrium in ~1.5s (90 frames)

    this.checkReducedMotion();

    const options: THREE.RenderTargetOptions = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };

    this.velocityPing = new THREE.WebGLRenderTarget(this.velocityResolution, this.velocityResolution, options);
    this.velocityPong = new THREE.WebGLRenderTarget(this.velocityResolution, this.velocityResolution, options);
    this.densityPing = new THREE.WebGLRenderTarget(this.densityResolution, this.densityResolution, options);
    this.densityPong = new THREE.WebGLRenderTarget(this.densityResolution, this.densityResolution, options);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeometry = new THREE.PlaneGeometry(2, 2);

    // 1. Splat Shader Material
    this.splatMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTarget;
        uniform float uAspectRatio;
        uniform vec2 uPoint;
        uniform vec3 uColor;
        uniform float uRadius;
        varying vec2 vUv;

        void main() {
          vec2 p = vUv - uPoint;
          p.x *= uAspectRatio;
          vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
        }
      `,
      uniforms: {
        uTarget: { value: null },
        uAspectRatio: { value: 1.0 },
        uPoint: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Vector3() },
        uRadius: { value: 0.0025 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 2. Advection Material
    this.advectionMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 uTexelSize;
        uniform float uDt;
        uniform float uDecay;
        varying vec2 vUv;

        void main() {
          vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
          gl_FragColor = uDecay * texture2D(uSource, coord);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / this.velocityResolution, 1 / this.velocityResolution) },
        uDt: { value: 0.016 },
        uDecay: { value: this.decayRate },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 3. Simple Decay Pass
    this.decayMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uSource;
        uniform float uDecay;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(uSource, vUv) * uDecay;
        }
      `,
      uniforms: {
        uSource: { value: null },
        uDecay: { value: this.decayRate },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  private checkReducedMotion(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }

  public injectSplats(ndcMouse: THREE.Vector2, deltaMouse: THREE.Vector2): void {
    if (this.isReducedMotion) return;

    const uvX = ndcMouse.x * 0.5 + 0.5;
    const uvY = ndcMouse.y * 0.5 + 0.5;
    const speed = deltaMouse.length();

    if (speed < 0.0001) return;

    // Inject velocity splat
    const quad = new THREE.Mesh(this.quadGeometry, this.splatMaterial);
    const scene = new THREE.Scene();
    scene.add(quad);

    this.splatMaterial.uniforms.uTarget.value = this.velocityPing.texture;
    this.splatMaterial.uniforms.uPoint.value.set(uvX, uvY);
    this.splatMaterial.uniforms.uColor.value.set(deltaMouse.x * 120.0, deltaMouse.y * 120.0, 0.0);
    this.splatMaterial.uniforms.uRadius.value = 0.0035;

    this.renderer.setRenderTarget(this.velocityPong);
    this.renderer.render(scene, this.camera);
    this.swapVelocity();

    scene.remove(quad);
  }

  public step(dt: number = 0.016): void {
    if (this.isReducedMotion) return;

    const quad = new THREE.Mesh(this.quadGeometry, this.advectionMaterial);
    const scene = new THREE.Scene();
    scene.add(quad);

    // Advect velocity
    this.advectionMaterial.uniforms.uVelocity.value = this.velocityPing.texture;
    this.advectionMaterial.uniforms.uSource.value = this.velocityPing.texture;
    this.advectionMaterial.uniforms.uDt.value = dt;
    this.advectionMaterial.uniforms.uDecay.value = this.decayRate;

    this.renderer.setRenderTarget(this.velocityPong);
    this.renderer.render(scene, this.camera);
    this.swapVelocity();

    scene.remove(quad);
  }

  private swapVelocity(): void {
    const temp = this.velocityPing;
    this.velocityPing = this.velocityPong;
    this.velocityPong = temp;
  }

  public getVelocityTexture(): THREE.Texture {
    return this.velocityPing.texture;
  }

  public dispose(): void {
    this.velocityPing.dispose();
    this.velocityPong.dispose();
    this.densityPing.dispose();
    this.densityPong.dispose();
    this.quadGeometry.dispose();
    this.splatMaterial.dispose();
    this.advectionMaterial.dispose();
    this.decayMaterial.dispose();
  }
}
