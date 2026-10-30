import { useEffect, useRef } from 'react';
import { useKalinarStore } from '../../store/useKalinarStore.js';

export function SingularityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { singularity } = useKalinarStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle simulation for accretion disk
    const particleCount = 1200;
    const particles = Array.from({ length: particleCount }, () => {
      const radius = 90 + Math.random() * 220;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.003 + (1 / radius) * 0.4;
      const size = Math.random() < 0.2 ? 1.5 : 0.8;
      const isLavender = Math.random() < 0.65;
      return { radius, angle, speed, size, isLavender };
    });

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;
    const render = () => {
      time += 0.015;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Mouse fluid influence on center
      const offsetX = (mouseX - centerX) * 0.03;
      const offsetY = (mouseY - centerY) * 0.03;
      const cx = centerX + offsetX;
      const cy = centerY + offsetY;

      // Voice modulation factor
      const voicePulse =
        singularity.voiceState === '[SPEAKING]'
          ? 1 + Math.sin(time * 8) * 0.12
          : 1 + Math.sin(time * 2) * 0.03;

      // Outer Gravitational Lensing Glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 60, cx, cy, 320 * voicePulse);
      glowGrad.addColorStop(0, 'rgba(170, 136, 255, 0.25)');
      glowGrad.addColorStop(0.35, 'rgba(170, 136, 255, 0.08)');
      glowGrad.addColorStop(0.7, 'rgba(139, 92, 246, 0.02)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 320 * voicePulse, 0, Math.PI * 2);
      ctx.fill();

      // Render Accretion Disk Particles
      for (const p of particles) {
        p.angle += p.speed * (singularity.voiceState === '[SPEAKING]' ? 1.4 : 1.0);
        const r = p.radius * voicePulse;
        const px = cx + Math.cos(p.angle) * r;
        const py = cy + Math.sin(p.angle) * (r * 0.45); // Elliptical projection

        ctx.fillStyle = p.isLavender ? '#AA88FF' : '#DDDDDD';
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Event Horizon (Central Pure Black Hole Core)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, Math.PI * 2);
      ctx.fill();

      // Event Horizon Boundary Rim
      ctx.strokeStyle = '#AA88FF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [singularity.voiceState]);

  return (
    <canvas
      id="singularity-bg"
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
