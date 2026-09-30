/** Plain-data particles (dust, snow, sparkles). Drawn by the renderer. */
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  gravity: number;
}

export function emit(list: Particle[], p: Omit<Particle, "maxLife">): void {
  list.push({ ...p, maxLife: p.life });
}

export function dustBurst(list: Particle[], x: number, y: number, count = 6, color = "#c9c2b0"): void {
  for (let i = 0; i < count; i++) {
    const a = Math.PI + (Math.random() * Math.PI);
    const speed = 20 + Math.random() * 30;
    emit(list, { x, y: y - 1, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed * 0.5, life: 0.3 + Math.random() * 0.2, color, size: 1, gravity: 60 });
  }
}

export function updateParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) {
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  return list.filter((p) => p.life > 0);
}
