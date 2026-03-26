import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

/**
 * Renders a full-screen canvas with slowly drifting particles
 * connected by faint lines — evoking a neural network / AI diagnostic aesthetic.
 * Supports dark mode with glowing particles.
 */
export default function NeuralNetworkBg({ darkMode = false }) {
  const canvasRef = useRef(null);
  const darkModeRef = useRef(darkMode);

  // Keep ref in sync without re-initializing
  useEffect(() => {
    darkModeRef.current = darkMode;
  }, [darkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    const PARTICLE_COUNT = 108;
    const CONNECTION_DIST = 140;
    const SPEED = 0.4;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const initParticles = () => {
      particles = [];
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * SPEED,
          vy: (Math.random() - 0.5) * SPEED,
          r: Math.random() * 2 + 1,
        });
      }
    };

    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const isDark = darkModeRef.current;
      ctx.clearRect(0, 0, w, h);

      // Move particles
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const alpha = (1 - dist / CONNECTION_DIST) * (isDark ? 0.35 : 0.24);
            ctx.strokeStyle = isDark
              ? `rgba(174, 198, 255, ${alpha})`
              : `rgba(0, 87, 192, ${alpha})`;
            ctx.lineWidth = isDark ? 0.8 : 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        if (isDark) {
          // Glow effect in dark mode
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(174, 198, 255, 0.4)';
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = isDark
          ? `rgba(174, 198, 255, 0.5)`
          : 'rgba(0, 87, 192, 0.15)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initParticles();
    draw();

    const handleResize = () => {
      resize();
      initParticles();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </Box>
  );
}
