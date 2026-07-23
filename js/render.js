/**
 * render.js - 2D Membrane Permeability Visualizer & Canvas Render Engine
 * Implements high-performance heatmap color maps, marching isolines, discrete solute particles,
 * and microscopic lipid bilayer structure (lipid heads & animated hydrophobic tails).
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

    // Precomputed colormaps (256 RGB entries)
    this.colormaps = {};
    this.initColormaps();
  }

  initColormaps() {
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

    this.colormaps.neon = this.generateColormap([
      { r: 7, g: 10, b: 20 },
      { r: 123, g: 44, b: 191 },
      { r: 247, g: 37, b: 133 },
      { r: 0, g: 242, b: 254 },
      { r: 255, g: 255, b: 255 }
    ]);

    this.colormaps.ocean = this.generateColormap([
      { r: 4, g: 12, b: 24 },
      { r: 10, g: 60, b: 110 },
      { r: 0, g: 180, b: 216 },
      { r: 0, g: 245, b: 212 },
      { r: 230, g: 255, b: 250 }
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
    } else {
      this.renderMicroView();
      if (this.showParticles) this.renderParticles();
    }

    this.renderChannelOverlay();
  }

  renderMacroHeatmap() {
    const { C, nx, ny } = this.physics;
    const cmap = this.colormaps[this.colorPaletteName] || this.colormaps.thermal;
    const data = this.imgData.data;

    const scaleX = nx / this.width;
    const scaleY = ny / this.height;

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

        // Bilinear interpolation
        const c00 = C[y0 * nx + x0];
        const c10 = C[y0 * nx + x1];
        const c01 = C[y1 * nx + x0];
        const c11 = C[y1 * nx + x1];

        const top = c00 + wx * (c10 - c00);
        const bottom = c01 + wx * (c11 - c01);
        const val = Math.max(0, Math.min(1.0, top + wy * (bottom - top)));

        const lutIdx = Math.floor(val * 255);
        const pIdx = (py * this.width + px) * 4;

        data[pIdx + 0] = cmap[lutIdx * 4 + 0];
        data[pIdx + 1] = cmap[lutIdx * 4 + 1];
        data[pIdx + 2] = cmap[lutIdx * 4 + 2];
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

    // Membrane block background glow
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    this.ctx.fillRect(x1, 0, memWidth, this.height);

    // Membrane borders
    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 4]);

    this.ctx.beginPath();
    this.ctx.moveTo(x1, 0);
    this.ctx.lineTo(x1, this.height);
    this.ctx.moveTo(x2, 0);
    this.ctx.lineTo(x2, this.height);
    this.ctx.stroke();

    // Center label
    this.ctx.setLineDash([]);
    this.ctx.font = '600 12px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('MEMBRANE SLAB', (x1 + x2) / 2, 24);

    this.ctx.restore();
  }

  renderIsolines() {
    const { C, nx, ny } = this.physics;
    const cellW = this.width / nx;
    const cellH = this.height / ny;
    const isoLevels = [0.15, 0.3, 0.5, 0.7, 0.85];

    this.ctx.save();
    this.ctx.lineWidth = 1.2;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';

    for (let level of isoLevels) {
      this.ctx.beginPath();
      for (let y = 0; y < ny - 1; y += 2) {
        for (let x = 0; x < nx - 1; x += 2) {
          const v0 = C[y * nx + x];
          const v1 = C[y * nx + x + 1];
          const v2 = C[(y + 1) * nx + x];

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
    this.ctx.restore();
  }

  renderParticles() {
    const { particles, nx, ny, params } = this.physics;
    const scaleX = this.width / nx;
    const scaleY = this.height / ny;

    const radNm = (params && Number.isFinite(params.radiusNm)) ? params.radiusNm : 0.70;
    const shape = (params && params.soluteShape) ? params.soluteShape : 'sphere';
    const aspectRatio = (params && Number.isFinite(params.aspectRatio)) ? Math.max(1.0, params.aspectRatio) : 1.0;

    const baseRadius = Math.max(3.0, Math.min(11.0, 3.0 + (radNm - 0.15) * 3.5));

    this.ctx.save();
    for (let p of particles) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

      const cx = p.x * scaleX;
      const cy = p.y * scaleY;

      if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;

      const angle = p.angle || 0;

      this.ctx.save();
      this.ctx.translate(cx, cy);

      if (shape === 'rod') {
        // 🥖 Rod / Elongated Cylinder (Capsule Geometry)
        const pLen = baseRadius * Math.sqrt(aspectRatio) * 1.6;
        const pWidth = Math.max(2.5, (baseRadius / Math.sqrt(aspectRatio)) * 1.2);
        
        this.ctx.rotate(angle);

        // Capsule fill & outline
        const grad = this.ctx.createLinearGradient(-pLen / 2, 0, pLen / 2, 0);
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.5)');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, 'rgba(0, 242, 254, 0.5)');

        this.ctx.fillStyle = grad;
        this.ctx.strokeStyle = '#00f2fe';
        this.ctx.lineWidth = 1.2;

        this.ctx.beginPath();
        if (typeof this.ctx.roundRect === 'function') {
          this.ctx.roundRect(-pLen / 2, -pWidth / 2, pLen, pWidth, pWidth / 2);
        } else {
          this.ctx.rect(-pLen / 2, -pWidth / 2, pLen, pWidth);
        }
        this.ctx.fill();
        this.ctx.stroke();

        // Inner backbone skeletal line
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.lineWidth = 1.4;
        this.ctx.beginPath();
        this.ctx.moveTo(-pLen * 0.35, 0);
        this.ctx.lineTo(pLen * 0.35, 0);
        this.ctx.stroke();

      } else if (shape === 'disc') {
        // 🪙 Disc / Planar Ring (3D Isometric Ellipse & Concentric Ring)
        const rx = baseRadius * Math.sqrt(aspectRatio) * 1.4;
        const ry = Math.max(2.5, (baseRadius / Math.sqrt(aspectRatio)) * 0.85);

        this.ctx.rotate(angle);

        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, '#ffb703');
        grad.addColorStop(1, 'rgba(255, 183, 3, 0.2)');

        this.ctx.fillStyle = grad;
        this.ctx.strokeStyle = '#ffb703';
        this.ctx.lineWidth = 1.4;

        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Concentric inner ring / torus core
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.lineWidth = 1.2;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
        this.ctx.stroke();

      } else {
        // 🟣 Sphere / Globular (Default)
        const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, radNm >= 1.0 ? '#ffb703' : '#00f2fe');
        grad.addColorStop(1, 'rgba(0, 242, 254, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
        this.ctx.fill();

        if (radNm >= 1.0) {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, baseRadius * 0.45, 0, Math.PI * 2);
          this.ctx.stroke();
        }
      }

      this.ctx.restore();
    }
    this.ctx.restore();
  }

  renderMicroView() {
    // Fill deep dark background
    this.ctx.fillStyle = '#060912';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.renderMacroHeatmap(); // Soft backdrop heatmap

    // Overlay lipid bilayer structural representation inside membrane block
    const { memStart, memEnd, nx, params, time } = this.physics;
    const { order, fluidity } = params;

    const x1 = (memStart / nx) * this.width;
    const x2 = (memEnd / nx) * this.width;
    const memWidth = x2 - x1;

    this.ctx.save();

    // Dark glass background for lipid core
    this.ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    this.ctx.fillRect(x1, 0, memWidth, this.height);

    // Render Lipid Heads & Wavy Hydrophobic Tails
    const numLipids = Math.floor(this.height / 18);
    const tailLength = memWidth * 0.42;

    for (let i = 0; i < numLipids; i++) {
      const yPos = i * 18 + 9;
      const phase = i * 0.5 + time * 4.0 * fluidity;

      // Outer Left Leaflet Lipid Head
      const h1x = x1 + 8;
      this.drawLipidHead(h1x, yPos);

      // Inner Left Leaflet Tail extending right
      const wiggle1 = Math.sin(phase) * (12.0 * (1.0 - 0.7 * order));
      this.drawLipidTail(h1x, yPos, h1x + tailLength, yPos + wiggle1, order);

      // Outer Right Leaflet Lipid Head
      const h2x = x2 - 8;
      this.drawLipidHead(h2x, yPos);

      // Inner Right Leaflet Tail extending left
      const wiggle2 = Math.cos(phase + 1.2) * (12.0 * (1.0 - 0.7 * order));
      this.drawLipidTail(h2x, yPos, h2x - tailLength, yPos + wiggle2, order);
    }

    // Membrane Title Overlay
    this.ctx.font = '600 13px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`LIPID BILAYER STRUCTURE (S = ${order.toFixed(2)}, \u03B7 = ${fluidity.toFixed(2)})`, (x1 + x2) / 2, 24);

    this.ctx.restore();
  }

  drawLipidHead(x, y) {
    // Polar hydrophilic head group
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
    // Hydrophobic acyl tails (2 wavy strands)
    this.ctx.save();
    this.ctx.strokeStyle = order > 0.7 ? '#3a86ff' : '#ff006e';
    this.ctx.lineWidth = 1.6;
    this.ctx.globalAlpha = 0.75;

    const midX = (xStart + xEnd) / 2;

    // Strand A
    this.ctx.beginPath();
    this.ctx.moveTo(xStart, yStart - 2);
    this.ctx.quadraticCurveTo(midX, yStart - 6 + (yEnd - yStart), xEnd, yEnd - 2);
    this.ctx.stroke();

    // Strand B
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
    // Clear channel cavity
    this.ctx.fillStyle = 'rgba(0, 242, 254, 0.15)';
    this.ctx.fillRect(x1, channelYStart, x2 - x1, channelH);

    // Channel Pore Alpha-Helices (top & bottom proteins)
    this.ctx.fillStyle = '#ffb703';
    this.ctx.strokeStyle = '#fb8500';
    this.ctx.lineWidth = 2;

    // Top protein cylinder
    this.ctx.fillRect(x1 - 4, channelYStart - 8, x2 - x1 + 8, 8);
    this.ctx.strokeRect(x1 - 4, channelYStart - 8, x2 - x1 + 8, 8);

    // Bottom protein cylinder
    this.ctx.fillRect(x1 - 4, channelYEnd, x2 - x1 + 8, 8);
    this.ctx.strokeRect(x1 - 4, channelYEnd, x2 - x1 + 8, 8);

    // Label
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

    const gradients = {
      viridis: 'linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)',
      plasma: 'linear-gradient(to right, #0d0887, #7e03a8, #cc4778, #f89540, #f0f921)',
      thermal: 'linear-gradient(to right, #080a12, #a0141e, #f56414, #ffc81e, #fff)',
      neon: 'linear-gradient(to right, #070a14, #7b2cbf, #f72585, #00f2fe, #fff)',
      ocean: 'linear-gradient(to right, #040c18, #0a3c6e, #00b4d8, #00f5d4, #e6fffa)'
    };
    el.style.background = gradients[name] || gradients.thermal;
  }
}
