/**
 * charts.js - Enriched Canvas Real-Time Charting Module (Dual Solutes & Dynamic Auto-Scaling)
 * Renders 1D Concentration Profiles C_A(x) & C_B(x) and Permeation Flux Time-Series J_A(t) & J_B(t).
 * Features dynamic Y-axis auto-scaling and logarithmic mode for clear visibility of small concentrations.
 */

class ChartEngine {
  constructor(physics) {
    this.physics = physics;
    this.profileCanvas = document.getElementById('profile-chart');
    this.profileCtx = this.profileCanvas.getContext('2d');

    this.fluxCanvas = document.getElementById('flux-chart');
    this.fluxCtx = this.fluxCanvas.getContext('2d');

    this.profileScaleMode = 'auto'; // 'auto' | 'log' | 'fixed'
  }

  update() {
    this.drawProfileChart();
    this.drawFluxChart();
  }

  formatTimeScale(sec, totalSpan) {
    if (!Number.isFinite(sec) || sec < 0) sec = 0;
    if (totalSpan < 120) {
      return `${sec.toFixed(1)}s`;
    } else if (totalSpan < 7200) {
      return `${(sec / 60).toFixed(1)}m`;
    } else if (totalSpan < 172800) {
      return `${(sec / 3600).toFixed(1)}h`;
    } else {
      return `${(sec / 86400).toFixed(1)}d`;
    }
  }

  drawProfileChart() {
    const ctx = this.profileCtx;
    const w = this.profileCanvas.width;
    const h = this.profileCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const profileA = this.physics.getProfile1D('A');
    const profileB = this.physics.getProfile1D('B');
    const nx = this.physics.nx;
    const { memStart, memEnd, viewSolute } = this.physics;

    const padL = 40;
    const padR = 16;
    const padT = 24;
    const padB = 26;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Calculate maximum concentration based on active view mode
    let maxValA = 0.01, maxValB = 0.01;
    for (let x = 0; x < nx; x++) {
      if (profileA[x] > maxValA) maxValA = profileA[x];
      if (profileB[x] > maxValB) maxValB = profileB[x];
    }

    let maxY = 1.0;
    if (this.profileScaleMode === 'auto') {
      if (viewSolute === 'A') maxY = Math.max(0.1, Math.ceil(maxValA * 1.15 * 20) / 20);
      else if (viewSolute === 'B') maxY = Math.max(0.1, Math.ceil(maxValB * 1.15 * 20) / 20);
      else maxY = Math.max(0.1, Math.ceil(Math.max(maxValA, maxValB) * 1.15 * 20) / 20);
    } else if (this.profileScaleMode === 'log') {
      maxY = 1.0; // Log scale maps log10(C) from -3.0 to +0.6
    }

    // Background grid & Y-axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let step = 0; step <= 4; step++) {
      const frac = step / 4;
      const yPos = padT + plotH * (1.0 - frac);

      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';

      if (this.profileScaleMode === 'log') {
        const logVal = -3.0 + frac * 3.6;
        ctx.fillText(logVal.toFixed(1), padL - 6, yPos + 3);
      } else {
        const v = frac * maxY;
        ctx.fillText(v >= 10 ? v.toFixed(0) : v.toFixed(2), padL - 6, yPos + 3);
      }
    }

    // Membrane Region Boundaries
    const memX1 = padL + (memStart / nx) * plotW;
    const memX2 = padL + (memEnd / nx) * plotW;

    ctx.fillStyle = 'rgba(0, 242, 254, 0.08)';
    ctx.fillRect(memX1, padT, memX2 - memX1, plotH);
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
    ctx.strokeRect(memX1, padT, memX2 - memX1, plotH);

    // Region Labels
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('DONOR', (padL + memX1) / 2, padT - 8);
    ctx.fillStyle = 'rgba(0, 242, 254, 0.9)';
    ctx.fillText('MEMBRANE', (memX1 + memX2) / 2, padT - 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('RECEIVER', (memX2 + w - padR) / 2, padT - 8);

    // Solute Legend
    ctx.textAlign = 'right';
    if (viewSolute === 'A' || viewSolute === 'both') {
      ctx.fillStyle = '#0077ff';
      ctx.fillText('\u25A0 Solute A', w - padR - (viewSolute === 'both' ? 70 : 0), padT - 8);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      ctx.fillStyle = '#ff3344';
      ctx.fillText('\u25A0 Solute B', w - padR, padT - 8);
    }

    // Helper to draw profile curve
    const drawCurve = (profile, color, fillColor) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let x = 0; x < nx; x++) {
        const px = padL + (x / (nx - 1)) * plotW;
        const val = Math.max(0, profile[x]);

        let normVal = 0;
        if (this.profileScaleMode === 'log') {
          const logVal = Math.log10(Math.max(1e-3, val));
          normVal = Math.max(0, Math.min(1.0, (logVal - (-3.0)) / 3.6));
        } else {
          normVal = Math.min(1.0, val / maxY);
        }
        const py = padT + plotH * (1.0 - normVal);

        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.lineTo(padL, padT + plotH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.restore();
    };

    if (viewSolute === 'A' || viewSolute === 'both') {
      drawCurve(profileA, '#0077ff', 'rgba(0, 119, 255, 0.12)');
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      drawCurve(profileB, '#ff3344', 'rgba(255, 51, 68, 0.12)');
    }

    // X-axis label
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Position across membrane axis (x)', padL + plotW / 2, h - 6);
  }

  drawFluxChart() {
    const ctx = this.fluxCtx;
    const w = this.fluxCanvas.width;
    const h = this.fluxCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const { timeHistory, fluxHistory, viewSolute } = this.physics;

    const padL = 40;
    const padR = 16;
    const padT = 24;
    const padB = 26;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (fluxHistory.length < 2) {
      // Empty grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      for (let v = 0; v <= 1.0; v += 0.25) {
        const yPos = padT + plotH * (1.0 - v);
        ctx.beginPath();
        ctx.moveTo(padL, yPos);
        ctx.lineTo(w - padR, yPos);
        ctx.stroke();
      }
      return;
    }

    // Dynamic Auto-Scaling for Receiver Accumulation Concentration
    let maxConcA = 0.01, maxConcB = 0.01;
    for (let i = 0; i < fluxHistory.length; i++) {
      if (fluxHistory[i].concA > maxConcA) maxConcA = fluxHistory[i].concA;
      if (fluxHistory[i].concB > maxConcB) maxConcB = fluxHistory[i].concB;
    }

    let maxFluxY = 0.1;
    if (viewSolute === 'A') maxFluxY = Math.max(0.01, Math.ceil(maxConcA * 1.25 * 100) / 100);
    else if (viewSolute === 'B') maxFluxY = Math.max(0.01, Math.ceil(maxConcB * 1.25 * 100) / 100);
    else maxFluxY = Math.max(0.01, Math.ceil(Math.max(maxConcA, maxConcB) * 1.25 * 100) / 100);

    // Grid lines & Y-axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let step = 0; step <= 4; step++) {
      const frac = step / 4;
      const v = frac * maxFluxY;
      const yPos = padT + plotH * (1.0 - frac);

      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(v < 0.1 ? v.toFixed(3) : v.toFixed(2), padL - 6, yPos + 3);
    }

    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText('Receiver Accumulation C_receiver(t)', padL, padT - 8);

    // Legend Indicators
    ctx.textAlign = 'right';
    if (viewSolute === 'A' || viewSolute === 'both') {
      ctx.fillStyle = '#0077ff';
      ctx.fillText('\u25A0 Solute A', w - padR - (viewSolute === 'both' ? 70 : 0), padT - 8);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      ctx.fillStyle = '#ff3344';
      ctx.fillText('\u25A0 Solute B', w - padR, padT - 8);
    }

    const latestTime = timeHistory[timeHistory.length - 1] || 1.0;
    const timeSpan = Math.max(5.0, Math.min(60.0, latestTime));
    const startTime = Math.max(0, latestTime - timeSpan);

    const drawFluxSeries = (key, color, fillColor) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath();

      const n = fluxHistory.length;
      let startedPlot = false;
      for (let i = 0; i < n; i++) {
        const tVal = timeHistory[i];
        if (tVal < startTime) continue;
        const px = padL + ((tVal - startTime) / timeSpan) * plotW;
        const val = fluxHistory[i][key] || 0;
        const normVal = Math.min(1.0, val / maxFluxY);
        const py = padT + plotH * (1.0 - normVal);

        if (!startedPlot) {
          ctx.moveTo(px, py);
          startedPlot = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      if (startedPlot) ctx.stroke();

      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.lineTo(padL, padT + plotH);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.restore();
    };

    if (viewSolute === 'A' || viewSolute === 'both') {
      drawFluxSeries('concA', '#0077ff', 'rgba(0, 119, 255, 0.12)');
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      drawFluxSeries('concB', '#ff3344', 'rgba(255, 51, 68, 0.12)');
    }

    // X-axis Time Ticks
    const numTicks = 5;
    ctx.font = '500 9px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';

    for (let k = 0; k < numTicks; k++) {
      const frac = k / (numTicks - 1);
      const tickTime = frac * timeSpan;
      const tx = padL + frac * plotW;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(tx, padT);
      ctx.lineTo(tx, padT + plotH);
      ctx.stroke();

      ctx.textAlign = k === 0 ? 'left' : (k === numTicks - 1 ? 'right' : 'center');
      ctx.fillText(this.formatTimeScale(tickTime, timeSpan), tx, padT + plotH + 13);
    }

    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0, 242, 254, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(`Total Time: ${this.formatTimeScale(latestTime, latestTime)}`, padL + plotW / 2, h - 2);
  }
}
