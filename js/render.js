/**
 * render.js - 2D Membrane Permeability Visualizer & Canvas Render Engine (Dual-Solute & Crystallization)
 * Implements Blue/Red composite heatmaps, marching isolines, discrete solute particles,
 * lipid bilayer structure, and sparkling crystalline precipitates & membrane cake layers.
 */

class RenderEngine {
  constructor(canvasId, physics) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.physics = physics;

    this.viewMode = 'macro'; // 'macro' or 'micro'
    this.colorPaletteName = 'thermal';
    this.showIsolines = true;
    this.showParticles = true;

    // Canvas dimensions
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Offscreen buffer for heatmap pixel rendering
    this.imgData = this.ctx.createImageData(this.width, this.height);

    // Precomputed colormaps for single-solute and dual-solute rendering
    this.colormaps = {};
    this.initColormaps();
  }

  initColormaps() {
    // Solute A (Blue Spectrum)
    this.colormaps.soluteA = this.generateColormap([
      { r: 4, g: 8, b: 24 },
      { r: 0, g: 85, b: 255 },
      { r: 0, g: 200, b: 255 },
      { r: 180, g: 245, b: 255 },
      { r: 255, g: 255, b: 255 }
    ]);

    // Solute B (Red Spectrum)
    this.colormaps.soluteB = this.generateColormap([
      { r: 24, g: 4, b: 12 },
      { r: 230, g: 0, b: 50 },
      { r: 255, g: 90, b: 0 },
      { r: 255, g: 210, b: 120 },
      { r: 255, g: 255, b: 255 }
    ]);

    this.colormaps.viridis = this.generateColormap([
      { r: 68, g: 1, b: 84 },
      { r: 59, g: 82, b: 139 },
      { r: 33, g: 145, b: 140 },
      { r: 94, g: 201, b: 98 },
      { r: 253, g: 231, b: 37 }
    ]);

    this.colormaps.plasma = this.generateColormap([
      { r: 13, g: 8, b: 135 },
      { r: 126, g: 3, b: 168 },
      { r: 204, g: 71, b: 120 },
      { r: 248, g: 149, b: 64 },
      { r: 240, g: 249, b: 33 }
    ]);

    this.colormaps.thermal = this.generateColormap([
      { r: 8, g: 10, b: 18 },
      { r: 160, g: 20, b: 30 },
      { r: 245, g: 100, b: 20 },
      { r: 255, g: 200, b: 30 },
      { r: 255, g: 255, b: 240 }
    ]);
  }

  generateColormap(stops) {
    const cmap = new Uint8ClampedArray(256 * 4);
    const numStops = stops.length;

    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const scaled = t * (numStops - 1);
      const idx = Math.floor(scaled);
      const rem = scaled - idx;

      const c1 = stops[idx];
      const c2 = stops[Math.min(idx + 1, numStops - 1)];

      cmap[i * 4 + 0] = Math.round(c1.r + rem * (c2.r - c1.r));
      cmap[i * 4 + 1] = Math.round(c1.g + rem * (c2.g - c1.g));
      cmap[i * 4 + 2] = Math.round(c1.b + rem * (c2.b - c1.b));
      cmap[i * 4 + 3] = 255;
    }
    return cmap;
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.viewMode === 'macro') {
      this.renderMacroHeatmap();
      this.renderMembraneOverlay();
      if (this.showIsolines) this.renderIsolines();
      if (this.showParticles) this.renderParticles();
      this.renderCrystalsAndCaking();
    } else {
      this.renderMicroView();
      if (this.showParticles) this.renderParticles();
      this.renderCrystalsAndCaking();
    }

    this.renderChannelOverlay();
  }

  renderMacroHeatmap() {
    const { C_A, C_B, nx, ny, viewSolute } = this.physics;
    const data = this.imgData.data;

    const scaleX = nx / this.width;
    const scaleY = ny / this.height;

    const cmapA = this.colormaps.soluteA;
    const cmapB = this.colormaps.soluteB;

    for (let py = 0; py < this.height; py++) {
      const gy = py * scaleY;
      const y0 = Math.floor(gy);
      const y1 = Math.min(ny - 1, y0 + 1);
      const wy = gy - y0;

      for (let px = 0; px < this.width; px++) {
        const gx = px * scaleX;
        const x0 = Math.floor(gx);
        const x1 = Math.min(nx - 1, x0 + 1);
        const wx = gx - x0;

        // Interpolate Solute A concentration
        const cA00 = C_A[y0 * nx + x0];
        const cA10 = C_A[y0 * nx + x1];
        const cA01 = C_A[y1 * nx + x0];
        const cA11 = C_A[y1 * nx + x1];
        const valA = Math.max(0, Math.min(1.0, (cA00 + wx * (cA10 - cA00)) + wy * ((cA01 + wx * (cA11 - cA01)) - (cA00 + wx * (cA10 - cA00)))));

        // Interpolate Solute B concentration
        const cB00 = C_B[y0 * nx + x0];
        const cB10 = C_B[y0 * nx + x1];
        const cB01 = C_B[y1 * nx + x0];
        const cB11 = C_B[y1 * nx + x1];
        const valB = Math.max(0, Math.min(1.0, (cB00 + wx * (cB10 - cB00)) + wy * ((cB01 + wx * (cB11 - cB01)) - (cB00 + wx * (cB10 - cB00)))));

        const pIdx = (py * this.width + px) * 4;

        if (viewSolute === 'A') {
          const lutIdx = Math.floor(valA * 255);
          data[pIdx + 0] = cmapA[lutIdx * 4 + 0];
          data[pIdx + 1] = cmapA[lutIdx * 4 + 1];
          data[pIdx + 2] = cmapA[lutIdx * 4 + 2];
        } else if (viewSolute === 'B') {
          const lutIdx = Math.floor(valB * 255);
          data[pIdx + 0] = cmapB[lutIdx * 4 + 0];
          data[pIdx + 1] = cmapB[lutIdx * 4 + 1];
          data[pIdx + 2] = cmapB[lutIdx * 4 + 2];
        } else {
          // Both Overlay: Composite Red (B) + Blue (A) color channels
          const lutA = Math.floor(valA * 255);
          const lutB = Math.floor(valB * 255);

          const r = Math.min(255, Math.round(cmapB[lutB * 4 + 0] * 1.0 + cmapA[lutA * 4 + 0] * 0.2));
          const g = Math.min(255, Math.round(cmapA[lutA * 4 + 1] * 0.5 + cmapB[lutB * 4 + 1] * 0.4));
          const b = Math.min(255, Math.round(cmapA[lutA * 4 + 2] * 1.0 + cmapB[lutB * 4 + 2] * 0.15));

          data[pIdx + 0] = r;
          data[pIdx + 1] = g;
          data[pIdx + 2] = b;
        }
        data[pIdx + 3] = 255;
      }
    }

    this.ctx.putImageData(this.imgData, 0, 0);
  }

  renderMembraneOverlay() {
    const { memStart, memEnd, nx } = this.physics;
    const x1 = (memStart / nx) * this.width;
    const x2 = (memEnd / nx) * this.width;
    const memWidth = x2 - x1;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    this.ctx.fillRect(x1, 0, memWidth, this.height);

    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(x1, 0);
    this.ctx.lineTo(x1, this.height);
    this.ctx.moveTo(x2, 0);
    this.ctx.lineTo(x2, this.height);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
    this.ctx.font = '600 12px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MEMBRANE SLAB', (x1 + x2) / 2, 24);

    this.ctx.restore();
  }

  renderCrystalsAndCaking() {
    if (this.physics.params.regime !== 'crystallization') return;

    const { C_precip_A, C_precip_B, nx, ny, memStart, viewSolute, time } = this.physics;
    const cellW = this.width / nx;
    const cellH = this.height / ny;

    this.ctx.save();

    // 1. Draw geometric shimmering micro-crystals throughout bulk liquid where precipitate exists
    for (let y = 1; y < ny - 1; y += 2) {
      for (let x = 1; x < nx - 1; x += 2) {
        const idx = y * nx + x;
        const pA = C_precip_A[idx];
        const pB = C_precip_B[idx];

        const cx = (x + 0.5) * cellW;
        const cy = (y + 0.5) * cellH;

        if ((viewSolute === 'A' || viewSolute === 'both') && pA > 0.05) {
          const sz = Math.min(6.5, 2.5 + pA * 3.5);
          const shimmer = Math.sin(time * 5.0 + x * 0.7 + y * 0.9) * 0.25 + 0.75;

          this.ctx.save();
          this.ctx.translate(cx, cy);
          this.ctx.rotate(x * 0.5 + y * 0.8 + time * 0.2);

          this.ctx.fillStyle = `rgba(220, 245, 255, ${0.85 * shimmer})`;
          this.ctx.strokeStyle = `rgba(0, 180, 255, ${0.9 * shimmer})`;
          this.ctx.lineWidth = 1.2;

          // Diamond / Rhombus crystal geometry
          this.ctx.beginPath();
          this.ctx.moveTo(0, -sz);
          this.ctx.lineTo(sz * 0.65, 0);
          this.ctx.lineTo(0, sz);
          this.ctx.lineTo(-sz * 0.65, 0);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.restore();
        }

        if ((viewSolute === 'B' || viewSolute === 'both') && pB > 0.05) {
          const sz = Math.min(6.0, 2.2 + pB * 3.2);
          const shimmer = Math.cos(time * 6.0 + x * 1.1 + y * 0.6) * 0.25 + 0.75;

          this.ctx.save();
          this.ctx.translate(cx + 2, cy - 2);
          this.ctx.rotate(-x * 0.4 + y * 0.7 - time * 0.3);

          this.ctx.fillStyle = `rgba(255, 220, 220, ${0.85 * shimmer})`;
          this.ctx.strokeStyle = `rgba(255, 60, 80, ${0.9 * shimmer})`;
          this.ctx.lineWidth = 1.2;

          this.ctx.beginPath();
          this.ctx.moveTo(0, -sz * 0.9);
          this.ctx.lineTo(sz * 0.8, -sz * 0.2);
          this.ctx.lineTo(sz * 0.5, sz * 0.8);
          this.ctx.lineTo(-sz * 0.5, sz * 0.8);
          this.ctx.lineTo(-sz * 0.8, -sz * 0.2);
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          this.ctx.restore();
        }
      }
    }

    // 2. Draw Membrane Cake Layer (Surface Fouling Crust) on donor-membrane wall
    const memX1 = (memStart / nx) * this.width;
    let surfaceCakeA = 0, surfaceCakeB = 0;
    for (let y = 0; y < ny; y++) {
      surfaceCakeA += C_precip_A[y * nx + memStart];
      surfaceCakeB += C_precip_B[y * nx + memStart];
    }
    surfaceCakeA /= ny;
    surfaceCakeB /= ny;

    const totalCake = (surfaceCakeA + surfaceCakeB);
    if (totalCake > 0.08) {
      const crustThickness = Math.min(14, 3 + totalCake * 8);

      const grad = this.ctx.createLinearGradient(memX1 - crustThickness, 0, memX1, 0);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.5, 'rgba(200, 240, 255, 0.45)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.85)');

      this.ctx.fillStyle = grad;
      this.ctx.fillRect(memX1 - crustThickness, 0, crustThickness, this.height);

      // Crystalline texture dots along crust
      this.ctx.fillStyle = '#ffffff';
      for (let y = 6; y < this.height; y += 12) {
        const dotX = memX1 - Math.random() * crustThickness;
        this.ctx.fillRect(dotX, y, 2.5, 2.5);
      }

      // Cake Layer Annotation
      this.ctx.font = '600 10px JetBrains Mono, monospace';
      this.ctx.fillStyle = '#fde047';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('CAKE LAYER (FOULING)', memX1 - crustThickness - 6, this.height - 12);
    }

    this.ctx.restore();
  }

  renderIsolines() {
    const { C_A, C_B, nx, ny, viewSolute } = this.physics;
    const cellW = this.width / nx;
    const cellH = this.height / ny;
    const isoLevels = [0.15, 0.35, 0.60, 0.80];

    this.ctx.save();
    this.ctx.lineWidth = 1.2;

    const renderGridIsolines = (grid, strokeColor) => {
      this.ctx.strokeStyle = strokeColor;
      for (let level of isoLevels) {
        this.ctx.beginPath();
        for (let y = 0; y < ny - 1; y += 2) {
          for (let x = 0; x < nx - 1; x += 2) {
            const v0 = grid[y * nx + x];
            const v1 = grid[y * nx + x + 1];

            if ((v0 - level) * (v1 - level) < 0) {
              const frac = (level - v0) / (v1 - v0 + 1e-6);
              const px = (x + frac) * cellW;
              const py = (y + 0.5) * cellH;
              this.ctx.moveTo(px, py - 2);
              this.ctx.lineTo(px, py + 2);
            }
          }
        }
        this.ctx.stroke();
      }
    };

    if (viewSolute === 'A' || viewSolute === 'both') {
      renderGridIsolines(C_A, 'rgba(0, 180, 255, 0.5)');
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      renderGridIsolines(C_B, 'rgba(255, 60, 80, 0.5)');
    }

    this.ctx.restore();
  }

  renderParticles() {
    const { particles, nx, ny, viewSolute } = this.physics;
    const scaleX = this.width / nx;
    const scaleY = this.height / ny;

    this.ctx.save();
    for (let p of particles) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      if (viewSolute === 'A' && p.type !== 'A') continue;
      if (viewSolute === 'B' && p.type !== 'B') continue;

      const cx = p.x * scaleX;
      const cy = p.y * scaleY;
      const radius = p.radius || (p.type === 'A' ? 3.5 : 3.0);
      const isA = (p.type === 'A');

      this.ctx.save();
      this.ctx.translate(cx, cy);

      const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, isA ? '#0077ff' : '#ff3344');
      grad.addColorStop(1, isA ? 'rgba(0, 119, 255, 0)' : 'rgba(255, 51, 68, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Inner core glow
      this.ctx.strokeStyle = isA ? 'rgba(0, 200, 255, 0.8)' : 'rgba(255, 150, 160, 0.8)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.restore();
    }
    this.ctx.restore();
  }

  renderMicroView() {
    this.ctx.fillStyle = '#060912';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderMacroHeatmap();

    const { memStart, memEnd, nx, params, time } = this.physics;
    const { order, fluidity } = params;

    const x1 = (memStart / nx) * this.width;
    const x2 = (memEnd / nx) * this.width;
    const memWidth = x2 - x1;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    this.ctx.fillRect(x1, 0, memWidth, this.height);

    const numLipids = Math.floor(this.height / 18);
    const tailLength = memWidth * 0.42;

    for (let i = 0; i < numLipids; i++) {
      const yPos = i * 18 + 9;
      const phase = i * 0.5 + time * 4.0 * fluidity;

      const h1x = x1 + 8;
      this.drawLipidHead(h1x, yPos);
      const wiggle1 = Math.sin(phase) * (12.0 * (1.0 - 0.7 * order));
      this.drawLipidTail(h1x, yPos, h1x + tailLength, yPos + wiggle1, order);

      const h2x = x2 - 8;
      this.drawLipidHead(h2x, yPos);
      const wiggle2 = Math.cos(phase + 1.2) * (12.0 * (1.0 - 0.7 * order));
      this.drawLipidTail(h2x, yPos, h2x - tailLength, yPos + wiggle2, order);
    }

    this.ctx.font = '600 13px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`LIPID BILAYER STRUCTURE (S = ${order.toFixed(2)}, \u03B7 = ${fluidity.toFixed(2)})`, (x1 + x2) / 2, 24);

    this.ctx.restore();
  }

  drawLipidHead(x, y) {
    const grad = this.ctx.createRadialGradient(x, y, 0, x, y, 7);
    grad.addColorStop(0, '#00f5d4');
    grad.addColorStop(0.7, '#00b4d8');
    grad.addColorStop(1, '#0077b6');

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  drawLipidTail(xStart, yStart, xEnd, yEnd, order) {
    this.ctx.save();
    this.ctx.strokeStyle = order > 0.7 ? '#3a86ff' : '#ff006e';
    this.ctx.lineWidth = 1.6;
    this.ctx.globalAlpha = 0.75;

    const midX = (xStart + xEnd) / 2;

    this.ctx.beginPath();
    this.ctx.moveTo(xStart, yStart - 2);
    this.ctx.quadraticCurveTo(midX, yStart - 6 + (yEnd - yStart), xEnd, yEnd - 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(xStart, yStart + 2);
    this.ctx.quadraticCurveTo(midX, yStart + 6 + (yEnd - yStart), xEnd, yEnd + 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderChannelOverlay() {
    if (!this.physics.params.hasChannel) return;

    const { memStart, memEnd, nx, ny } = this.physics;
    const x1 = (memStart / nx) * this.width;
    const x2 = (memEnd / nx) * this.width;

    const channelYStart = (0.42 * ny / ny) * this.height;
    const channelYEnd = (0.58 * ny / ny) * this.height;
    const channelH = channelYEnd - channelYStart;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
    this.ctx.fillRect(x1, channelYStart, x2 - x1, channelH);

    this.ctx.fillStyle = '#ffb703';
    this.ctx.strokeStyle = '#fb8500';
    this.ctx.lineWidth = 2;

    this.ctx.fillRect(x1 - 4, channelYStart - 8, x2 - x1 + 8, 8);
    this.ctx.strokeRect(x1 - 4, channelYStart - 8, x2 - x1 + 8, 8);

    this.ctx.fillRect(x1 - 4, channelYEnd, x2 - x1 + 8, 8);
    this.ctx.strokeRect(x1 - 4, channelYEnd, x2 - x1 + 8, 8);

    this.ctx.font = '600 11px Inter, sans-serif';
    this.ctx.fillStyle = '#ffb703';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('AQUEOUS CHANNEL PORE', (x1 + x2) / 2, channelYStart + channelH / 2 + 4);

    this.ctx.restore();
  }

  setColormap(name) {
    if (this.colormaps[name]) {
      this.colorPaletteName = name;
      this.updateLegendGradient(name);
    }
  }

  updateLegendGradient(name) {
    const el = document.getElementById('legend-gradient');
    if (!el) return;
    el.style.background = 'linear-gradient(to right, #0077ff, #7b2cbf, #ff3344)';
  }
}
