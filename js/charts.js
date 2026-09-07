/**
 * charts.js - Enriched Canvas Real-Time Charting Module (Dual Solutes, Dynamic Auto-Scaling & Crystallization)
 * Renders 1D Concentration Profiles C_A(x) & C_B(x), Precipitates C_precip(x), Solubility Limits C_sat,
 * and Permeation Flux Time-Series J_A(t) & J_B(t).
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

  getThemeColors() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      return {
        isLight: true,
        textAxis: '#334155',
        textLabel: '#0f172a',
        textMuted: '#64748b',
        gridLine: 'rgba(0, 0, 0, 0.09)',
        memBg: 'rgba(14, 165, 233, 0.12)',
        memBorder: 'rgba(14, 165, 233, 0.55)',
        memText: '#0284c7',
        soluteA: '#0284c7',
        soluteAFill: 'rgba(2, 132, 199, 0.18)',
        soluteAPrecip: 'rgba(56, 189, 248, 0.38)',
        soluteB: '#e11d48',
        soluteBFill: 'rgba(225, 29, 72, 0.18)',
        soluteBPrecip: 'rgba(244, 63, 94, 0.38)',
        accent: '#0d9488'
      };
    } else {
      return {
        isLight: false,
        textAxis: '#e2e8f0',   // High contrast white-slate
        textLabel: '#f8fafc',  // Pure crisp white
        textMuted: '#cbd5e1',  // Legible light gray
        gridLine: 'rgba(255, 255, 255, 0.13)',
        memBg: 'rgba(0, 242, 254, 0.10)',
        memBorder: 'rgba(0, 242, 254, 0.45)',
        memText: '#00f5d4',
        soluteA: '#38bdf8',
        soluteAFill: 'rgba(56, 189, 248, 0.22)',
        soluteAPrecip: 'rgba(0, 200, 255, 0.38)',
        soluteB: '#fb7185',
        soluteBFill: 'rgba(251, 113, 133, 0.22)',
        soluteBPrecip: 'rgba(255, 100, 70, 0.38)',
        accent: '#2dd4bf'
      };
    }
  }

  drawProfileChart() {
    const ctx = this.profileCtx;
    const w = this.profileCanvas.width;
    const h = this.profileCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const tc = this.getThemeColors();

    const profileA = this.physics.getProfile1D('A');
    const profileB = this.physics.getProfile1D('B');
    const precipA = this.physics.getPrecipProfile1D('A');
    const precipB = this.physics.getPrecipProfile1D('B');

    const nx = this.physics.nx;
    const { memStart, memEnd, viewSolute, params } = this.physics;
    const isCryst = (params.regime === 'crystallization');

    const satA = params.soluteA.solubilityLimit || 1.2;
    const satB = params.soluteB.solubilityLimit || 0.6;

    const padL = 46;
    const padR = 16;
    const padT = 26;
    const padB = 28;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Calculate maximum concentration based on active view mode (including precipitate fraction)
    let maxValA = 0.01, maxValB = 0.01;
    for (let x = 0; x < nx; x++) {
      const totA = profileA[x] + (isCryst ? precipA[x] : 0);
      const totB = profileB[x] + (isCryst ? precipB[x] : 0);
      if (totA > maxValA) maxValA = totA;
      if (totB > maxValB) maxValB = totB;
    }
    if (isCryst) {
      if (satA > maxValA) maxValA = satA;
      if (satB > maxValB) maxValB = satB;
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
    ctx.strokeStyle = tc.gridLine;
    ctx.lineWidth = 1;

    for (let step = 0; step <= 4; step++) {
      const frac = step / 4;
      const yPos = padT + plotH * (1.0 - frac);

      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 11px JetBrains Mono, monospace';
      ctx.fillStyle = tc.textAxis;
      ctx.textAlign = 'right';

      if (this.profileScaleMode === 'log') {
        const logVal = -3.0 + frac * 3.6;
        ctx.fillText(logVal.toFixed(1), padL - 6, yPos + 4);
      } else {
        const v = frac * maxY;
        ctx.fillText(v >= 10 ? v.toFixed(0) : v.toFixed(2), padL - 6, yPos + 4);
      }
    }

    // Membrane Region Boundaries
    const memX1 = padL + (memStart / nx) * plotW;
    const memX2 = padL + (memEnd / nx) * plotW;

    ctx.fillStyle = tc.memBg;
    ctx.fillRect(memX1, padT, memX2 - memX1, plotH);
    ctx.strokeStyle = tc.memBorder;
    ctx.strokeRect(memX1, padT, memX2 - memX1, plotH);

    // Region Labels above chart
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = tc.textMuted;
    ctx.textAlign = 'center';
    ctx.fillText('DONOR', (padL + memX1) / 2, padT - 9);
    ctx.fillStyle = tc.memText;
    ctx.fillText('MEMBRÁNA', (memX1 + memX2) / 2, padT - 9);
    ctx.fillStyle = tc.textMuted;
    ctx.fillText('RECEIVER', (memX2 + w - padR) / 2, padT - 9);

    // Solute Legend
    ctx.textAlign = 'right';
    if (viewSolute === 'A' || viewSolute === 'both') {
      ctx.fillStyle = tc.soluteA;
      ctx.fillText('\u25A0 Látka A', w - padR - (viewSolute === 'both' ? 76 : 0), padT - 9);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      ctx.fillStyle = tc.soluteB;
      ctx.fillText('\u25A0 Látka B', w - padR, padT - 9);
    }

    // Render dashed horizontal lines for Solubility Limits C_sat in crystallization regime
    if (isCryst && this.profileScaleMode !== 'log') {
      const drawSatLine = (satVal, color, label) => {
        if (satVal <= maxY && satVal >= 0) {
          const yPos = padT + plotH * (1.0 - (satVal / maxY));
          ctx.save();
          ctx.strokeStyle = color;
          ctx.setLineDash([4, 4]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(padL, yPos);
          ctx.lineTo(w - padR, yPos);
          ctx.stroke();

          ctx.font = '500 9px JetBrains Mono, monospace';
          ctx.fillStyle = color;
          ctx.textAlign = 'left';
          ctx.fillText(label, padL + 6, yPos - 3);
          ctx.restore();
        }
      };

      if (viewSolute === 'A' || viewSolute === 'both') {
        drawSatLine(satA, 'rgba(0, 119, 255, 0.7)', `C_sat,A = ${satA.toFixed(2)} mM`);
      }
      if (viewSolute === 'B' || viewSolute === 'both') {
        drawSatLine(satB, 'rgba(255, 51, 68, 0.7)', `C_sat,B = ${satB.toFixed(2)} mM`);
      }
    }

    // Helper to draw profile curves (both free monomer and precipitate solid fraction)
    const drawCurveAndPrecip = (freeProfile, precipProfile, color, fillColor, precipColor) => {
      // 1. Draw solid crystal precipitate layer (if any)
      if (isCryst && precipProfile) {
        ctx.save();
        ctx.fillStyle = precipColor;
        ctx.beginPath();
        for (let x = 0; x < nx; x++) {
          const px = padL + (x / (nx - 1)) * plotW;
          const totVal = freeProfile[x] + precipProfile[x];
          const normVal = Math.min(1.0, totVal / maxY);
          const py = padT + plotH * (1.0 - normVal);
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        for (let x = nx - 1; x >= 0; x--) {
          const px = padL + (x / (nx - 1)) * plotW;
          const normFree = Math.min(1.0, freeProfile[x] / maxY);
          const py = padT + plotH * (1.0 - normFree);
          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Draw free dissolved concentration line
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      for (let x = 0; x < nx; x++) {
        const px = padL + (x / (nx - 1)) * plotW;
        const val = Math.max(0, freeProfile[x]);

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
      drawCurveAndPrecip(profileA, precipA, tc.soluteA, tc.soluteAFill, tc.soluteAPrecip);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      drawCurveAndPrecip(profileB, precipB, tc.soluteB, tc.soluteBFill, tc.soluteBPrecip);
    }

    // X-axis label
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillStyle = tc.textAxis;
    ctx.textAlign = 'center';
    ctx.fillText('Pozice podél osy membrány (x)', padL + plotW / 2, h - 8);
  }

  drawFluxChart() {
    const ctx = this.fluxCtx;
    const w = this.fluxCanvas.width;
    const h = this.fluxCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const tc = this.getThemeColors();
    const { timeHistory, fluxHistory, viewSolute } = this.physics;

    const padL = 46;
    const padR = 16;
    const padT = 26;
    const padB = 28;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    if (fluxHistory.length < 2) {
      // Empty grid
      ctx.strokeStyle = tc.gridLine;
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
    ctx.strokeStyle = tc.gridLine;
    ctx.lineWidth = 1;

    for (let step = 0; step <= 4; step++) {
      const frac = step / 4;
      const v = frac * maxFluxY;
      const yPos = padT + plotH * (1.0 - frac);

      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 11px JetBrains Mono, monospace';
      ctx.fillStyle = tc.textAxis;
      ctx.textAlign = 'right';
      ctx.fillText(v < 0.1 ? v.toFixed(3) : v.toFixed(2), padL - 6, yPos + 4);
    }

    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = tc.accent;
    ctx.textAlign = 'left';
    ctx.fillText('Akumulace v receiveru C_receiver(t)', padL, padT - 9);

    // Legend Indicators
    ctx.textAlign = 'right';
    if (viewSolute === 'A' || viewSolute === 'both') {
      ctx.fillStyle = tc.soluteA;
      ctx.fillText('\u25A0 Látka A', w - padR - (viewSolute === 'both' ? 76 : 0), padT - 9);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      ctx.fillStyle = tc.soluteB;
      ctx.fillText('\u25A0 Látka B', w - padR, padT - 9);
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
      drawFluxSeries('concA', tc.soluteA, tc.soluteAFill);
    }
    if (viewSolute === 'B' || viewSolute === 'both') {
      drawFluxSeries('concB', tc.soluteB, tc.soluteBFill);
    }

    // X-axis Time Ticks
    const numTicks = 5;
    ctx.font = '500 10px JetBrains Mono, monospace';
    ctx.fillStyle = tc.textAxis;

    for (let k = 0; k < numTicks; k++) {
      const frac = k / (numTicks - 1);
      const tickTime = frac * timeSpan;
      const tx = padL + frac * plotW;

      ctx.strokeStyle = tc.gridLine;
      ctx.beginPath();
      ctx.moveTo(tx, padT);
      ctx.lineTo(tx, padT + plotH);
      ctx.stroke();

      ctx.textAlign = k === 0 ? 'left' : (k === numTicks - 1 ? 'right' : 'center');
      ctx.fillText(this.formatTimeScale(tickTime, timeSpan), tx, padT + plotH + 15);
    }

    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = tc.accent;
    ctx.textAlign = 'center';
    ctx.fillText(`Simulační čas: ${this.formatTimeScale(latestTime, latestTime)}`, padL + plotW / 2, h - 3);
  }
}
