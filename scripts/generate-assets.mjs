/**
 * Generates assets/icon.png (1024x1024) and assets/splash.png (2732x2732)
 * for Capacitor iOS using the @napi-rs/canvas package.
 *
 * Usage:
 *   npm install @napi-rs/canvas --save-dev
 *   node scripts/generate-assets.mjs
 */

import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

mkdirSync(join(ROOT, 'assets'), { recursive: true });

// ─── Shared drawing: molecule icon ───────────────────────────────────────────

function drawMolecule(ctx, cx, cy, size) {
  const s = size / 100;
  function x(v) { return cx - size / 2 + v * s; }
  function y(v) { return cy - size / 2 + v * s; }

  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 5 * s;

  const bonds = [
    [50, 50, 20, 28],
    [50, 50, 80, 28],
    [50, 50, 15, 65],
    [50, 50, 85, 65],
    [50, 50, 50, 86],
  ];
  bonds.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x(x1), y(y1));
    ctx.lineTo(x(x2), y(y2));
    ctx.stroke();
  });

  ctx.fillStyle = '#86efac';
  [[20,28],[80,28],[15,65],[85,65],[50,86]].forEach(([nx, ny]) => {
    ctx.beginPath();
    ctx.arc(x(nx), y(ny), 9 * s, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x(50), y(50), 16 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(x(50), y(50), 9 * s, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Icon: 1024×1024, green gradient background ───────────────────────────────

function generateIcon() {
  const S = 1024;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#16a34a');
  grad.addColorStop(1, '#064e3b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  drawMolecule(ctx, S / 2, S / 2, S * 0.66);

  writeFileSync(join(ROOT, 'assets/icon.png'), canvas.toBuffer('image/png'));
  console.log('✓ assets/icon.png (1024×1024)');
}

// ─── Splash: 2732×2732, dark background ───────────────────────────────────────

function generateSplash() {
  const S = 2732;
  const canvas = createCanvas(S, S);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, S, S);

  const iconSize = 480;
  const centerY = S / 2 - 50;
  drawMolecule(ctx, S / 2, centerY, iconSize);

  ctx.fillStyle = '#16a34a';
  ctx.font = `bold ${Math.round(S * 0.022)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('PEPTIDE GUIDE', S / 2, centerY + iconSize / 2 + 90);

  writeFileSync(join(ROOT, 'assets/splash.png'), canvas.toBuffer('image/png'));
  console.log('✓ assets/splash.png (2732×2732)');
}

generateIcon();
generateSplash();
console.log('\nDone! Now run: npx capacitor-assets generate --ios && npx cap sync');
