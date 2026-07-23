/**
 * charts.js - Enriched Canvas Real-Time Charting Module
 * Renders the 1D Concentration Profile C(x) and Permeation Flux Time-Series J(t)
 * with dynamic time unit scaling (seconds -> minutes -> hours -> days).
 */

class ChartEngine {
  constructor(physics) {
    this.physics = physics;
    this.profileCanvas = document.getElementById('profile-chart');
    this.profileCtx = this.profileCanvas.getContext('2d');

    this.fluxCanvas = document.getElementById('flux-chart');
    this.fluxCtx = this.fluxCanvas.getContext('2d');
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

    const profile = this.physics.getProfile1D();
    const nx = this.physics.nx;
    const { memStart, memEnd } = this.physics;

    const padL = 36;
    const padR = 16;
    const padT = 24;
    const padB = 26;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Dynamically calculate max Y-axis limit based on current concentration profile (up to K)
    let maxVal = 1.0;
    for (let x = 0; x < nx; x++) {
      if (profile[x] > maxVal) maxVal = profile[x];
    }
    const maxY = Math.max(1.2, Math.ceil(maxVal * 1.15 * 10) / 10);

    // Background grid & dynamic Y-axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let step = 0; step <= 4; step++) {
      const frac = step / 4;
      const v = frac * maxY;
      const yPos = padT + plotH * (1.0 - frac);
      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(1), padL - 6, yPos + 3);
    }

    // Membrane Region Boundaries
    const memX1 = padL + (memStart / nx) * plotW;
    const memX2 = padL + (memEnd / nx) * plotW;

    // Region shading
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

    // Profile curve line
    ctx.save();
    const grad = ctx.createLinearGradient(padL, 0, w - padR, 0);
    grad.addColorStop(0, '#ff3366');
    grad.addColorStop(0.5, '#00f2fe');
    grad.addColorStop(1, '#00f5d4');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    for (let x = 0; x < nx; x++) {
      const px = padL + (x / (nx - 1)) * plotW;
      const val = Math.max(0, profile[x]);
      const normVal = Math.min(1.0, val / maxY);
      const py = padT + plotH * (1.0 - normVal);

      if (x === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Fill under profile curve
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.lineTo(padL, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 242, 254, 0.12)';
    ctx.fill();

    // X-axis label
    ctx.font = '500 10px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'center';
    ctx.fillText('Position across membrane axis (x)', padL + plotW / 2, h - 6);

    ctx.restore();
  }

  drawFluxChart() {
    const ctx = this.fluxCtx;
    const w = this.fluxCanvas.width;
    const h = this.fluxCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const { timeHistory, fluxHistory } = this.physics;

    const padL = 36;
    const padR = 16;
    const padT = 24;
    const padB = 26;

    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    // Grid lines & Y-axis labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;

    for (let v = 0; v <= 1.0; v += 0.25) {
      const yPos = padT + plotH * (1.0 - v);
      ctx.beginPath();
      ctx.moveTo(padL, yPos);
      ctx.lineTo(w - padR, yPos);
      ctx.stroke();

      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(v.toFixed(2), padL - 6, yPos + 3);
    }

    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0, 245, 212, 0.9)';
    ctx.textAlign = 'left';
    ctx.fillText('Receiver Conc. C_receiver(t) & Lag Phase (\u03C4)', padL, padT - 8);

    if (fluxHistory.length < 2) return;

    // Calculate exact physical lag time in seconds for chart placement
    const { thicknessNm, partitionK, dBase25C, dBase, soluteShape, aspectRatio, order, fluidity } = this.physics.params;
    const baseD = dBase25C !== undefined ? dBase25C : (dBase || 2.30);
    const tempFactor = this.physics.getTemperatureFactor();
    const rh = this.physics.computeHydrodynamicRadius();
    const fShape = this.physics.getPerrinShapeFactor(soluteShape, aspectRatio);
    const radRatio = 0.17 / Math.max(0.08, rh);
    const dWaterCm2s = baseD * radRatio * tempFactor * 1e-5;
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * (order !== undefined ? order : 0.60));
    const dMemCm2s = dWaterCm2s * 0.00016 * (fluidity !== undefined ? fluidity : 0.55) * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
    const thicknessCm = (thicknessNm || 3.9) * 1e-7;
    const lagTimeSec = (thicknessCm * thicknessCm) / Math.max(1e-18, 6 * dMemCm2s);

    // Map active trajectory window (max 60 seconds of simulation history for clear display)
    const latestTime = timeHistory[timeHistory.length - 1] || 1.0;
    const timeSpan = Math.max(5.0, Math.min(60.0, latestTime));
    const startTime = Math.max(0, latestTime - timeSpan);

    // Lag time vertical line
    if (lagTimeSec >= startTime && lagTimeSec <= latestTime) {
      const lagX = padL + ((lagTimeSec - startTime) / timeSpan) * plotW;

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(lagX, padT);
      ctx.lineTo(lagX, padT + plotH);
      ctx.stroke();

      ctx.font = '500 9px JetBrains Mono, monospace';
      ctx.fillStyle = '#ffb703';
      ctx.textAlign = 'center';
      const formattedLagStr = `${(lagTimeSec * 1e6).toFixed(1)} \u03BCs`;
      ctx.fillText(`\u03C4 = ${formattedLagStr}`, lagX, padT + 12);
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = '#00f5d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    const n = fluxHistory.length;
    let startedPlot = false;
    for (let i = 0; i < n; i++) {
      const tVal = timeHistory[i];
      if (tVal < startTime) continue;
      const px = padL + ((tVal - startTime) / timeSpan) * plotW;
      const normVal = Math.min(1.0, fluxHistory[i].conc);
      const py = padT + plotH * (1.0 - normVal);

      if (!startedPlot) {
        ctx.moveTo(px, py);
        startedPlot = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    if (startedPlot) ctx.stroke();

    // Area fill
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.lineTo(padL, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 245, 212, 0.12)';
    ctx.fill();

    // X-axis Time Ticks (from 0 to total time in s/min/h/d)
    const numTicks = 5;
    ctx.font = '500 9px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';

    for (let k = 0; k < numTicks; k++) {
      const frac = k / (numTicks - 1);
      const tickTime = frac * timeSpan;
      const tx = padL + frac * plotW;

      // Vertical tick line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.beginPath();
      ctx.moveTo(tx, padT);
      ctx.lineTo(tx, padT + plotH);
      ctx.stroke();

      // Dynamic Tick Label
      ctx.textAlign = k === 0 ? 'left' : (k === numTicks - 1 ? 'right' : 'center');
      ctx.fillText(this.formatTimeScale(tickTime, timeSpan), tx, padT + plotH + 13);
    }

    // Latest value marker dot
    const latestConc = fluxHistory[n - 1].conc;
    const lastPx = padL + plotW;
    const lastPy = padT + plotH * (1.0 - Math.min(1.0, latestConc));

    ctx.fillStyle = '#00f5d4';
    ctx.beginPath();
    ctx.arc(lastPx, lastPy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Value annotation tag
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.fillStyle = '#00f5d4';
    ctx.textAlign = 'right';
    ctx.fillText(`${latestConc.toFixed(3)}`, w - padR, lastPy - 8 > padT ? lastPy - 8 : lastPy + 14);

    // X-axis Subtitle showing Total Time
    ctx.font = '600 10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(0, 242, 254, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText(`Total Time: ${this.formatTimeScale(endTime, endTime)}`, padL + plotW / 2, h - 2);

    ctx.restore();
  }
}
