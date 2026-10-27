/**
 * minisims.js - Isolated Mini-Simulators for Key Permeability Parameters
 * 1. Partition Coefficient K (Membrane-Water Phase Equilibrium with Exact Detailed Balance)
 * 2. Diffusion Coefficient D (Stokes-Einstein Brownian Motion & Dispersion)
 * 3. Overton Synthesis: P = K * D_mem / d (Unified with Main Physics Engine)
 */

class MiniSimulators {
  constructor(mainPhysics, mainControls) {
    this.mainPhysics = mainPhysics;
    this.mainControls = mainControls;

    this.initPartitionSim();
    this.initDiffusionSim();
    this.initSynthesis();
  }

  /* =========================================================
     1. PARTITION COEFFICIENT (K) MINI-SIMULATOR
     ========================================================= */
  initPartitionSim() {
    this.partCanvas = document.getElementById('minisim-partition-canvas');
    if (!this.partCanvas) return;
    this.partCtx = this.partCanvas.getContext('2d');
    this.partW = this.partCanvas.width;
    this.partH = this.partCanvas.height;

    this.partRunning = true;
    this.targetK = 3.05; // Default Ibuprofen K
    this.partParticles = [];
    this.numPartParticles = 160;

    // Boundary interface at 50% width (equal volumes V_water = V_lipid)
    this.interfaceX = this.partW * 0.5;

    this.resetPartitionParticles();
    this.bindPartitionControls();
  }

  resetPartitionParticles() {
    this.partParticles = [];
    // Initialize near equilibrium distribution so students can also watch relaxation when K is changed
    const pLipid = this.targetK / (1.0 + this.targetK);
    for (let i = 0; i < this.numPartParticles; i++) {
      // Start in water so students observe partitioning into the membrane
      const x = Math.random() * (this.interfaceX - 16) + 8;
      const y = Math.random() * (this.partH - 16) + 8;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.65;
      this.partParticles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.2,
        phase: 'water'
      });
    }
  }

  bindPartitionControls() {
    const sliderK = document.getElementById('minisim-k-slider');
    const badgeK = document.getElementById('minisim-k-val');
    const badgeLogP = document.getElementById('minisim-logp-val');
    const presetSelect = document.getElementById('minisim-k-preset');
    const btnReset = document.getElementById('minisim-k-reset');
    const btnPlay = document.getElementById('minisim-k-play');

    const updateK = (val) => {
      this.targetK = parseFloat(val);
      if (badgeK) badgeK.textContent = this.targetK.toFixed(2);
      if (badgeLogP) badgeLogP.textContent = Math.log10(this.targetK).toFixed(2);
      if (sliderK) sliderK.value = this.targetK;
      this.updateSynthesisUI();
    };

    if (sliderK) {
      sliderK.addEventListener('input', (e) => {
        updateK(e.target.value);
        if (presetSelect) presetSelect.value = 'custom';
      });
    }

    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const presets = {
          hydrophilic: 0.05,
          caffeine: 0.15,
          neutral: 1.00,
          ibuprofen: 3.05,
          steroid: 7.50
        };
        if (presets[e.target.value] !== undefined) {
          updateK(presets[e.target.value]);
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.resetPartitionParticles();
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.partRunning = !this.partRunning;
        btnPlay.textContent = this.partRunning ? '⏸ Pause' : '▶ Play';
      });
    }
  }

  updatePartitionPhysics() {
    if (!this.partRunning) return;

    const K = Math.max(0.02, this.targetK);
    const boundaryX = this.interfaceX;
    const w = this.partW;
    const h = this.partH;

    // Speed in water and lipid:
    const vWater = 1.9;
    const vLipid = 1.3;

    // Exact Detailed Balance at the interface:
    // Flux(water -> lipid) = C_water * vWater * pEnterLipid
    // Flux(lipid -> water) = C_lipid * vLipid * pEnterWater
    // At equilibrium, C_lipid / C_water = K  ==>  pEnterLipid / pEnterWater = K * (vLipid / vWater)
    const fluxRatio = K * (vLipid / vWater);
    const pEnterLipid = fluxRatio >= 1.0 ? 0.90 : 0.90 * fluxRatio;
    const pEnterWater = fluxRatio >= 1.0 ? (0.90 / fluxRatio) : 0.90;

    for (let p of this.partParticles) {
      // Brownian thermal fluctuation
      p.vx += (Math.random() - 0.5) * 0.45;
      p.vy += (Math.random() - 0.5) * 0.45;

      // Maintain phase thermal speed
      const spd = Math.hypot(p.vx, p.vy);
      const targetSpd = (p.x >= boundaryX) ? vLipid : vWater;
      if (spd > 0.01) {
        p.vx = (p.vx / spd) * (0.85 * spd + 0.15 * targetSpd);
        p.vy = (p.vy / spd) * (0.85 * spd + 0.15 * targetSpd);
      }

      const nextX = p.x + p.vx;

      // Check crossing of phase interface
      if (p.x < boundaryX && nextX >= boundaryX) {
        // Trying to enter Lipid Phase from Water
        if (Math.random() < pEnterLipid) {
          p.x = nextX;
          p.phase = 'lipid';
        } else {
          p.vx = -Math.abs(p.vx);
          p.x = boundaryX - 1;
        }
      } else if (p.x >= boundaryX && nextX < boundaryX) {
        // Trying to enter Water Phase from Lipid
        if (Math.random() < pEnterWater) {
          p.x = nextX;
          p.phase = 'water';
        } else {
          p.vx = Math.abs(p.vx);
          p.x = boundaryX + 1;
        }
      } else {
        p.x = nextX;
      }

      // Outer boundaries bounce
      if (p.x < p.radius) { p.x = p.radius; p.vx = Math.abs(p.vx); }
      if (p.x > w - p.radius) { p.x = w - p.radius; p.vx = -Math.abs(p.vx); }
      if (p.y < p.radius) { p.y = p.radius; p.vy = Math.abs(p.vy); }
      if (p.y > h - p.radius) { p.y = h - p.radius; p.vy = -Math.abs(p.vy); }

      p.y += p.vy;
    }
  }

  drawPartitionSim() {
    if (!this.partCtx) return;
    const ctx = this.partCtx;
    const w = this.partW;
    const h = this.partH;
    const midX = this.interfaceX;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, w, h);

    // Left Phase: Water (Aqueous, polar)
    ctx.fillStyle = isLight ? 'rgba(56, 189, 248, 0.15)' : 'rgba(12, 74, 110, 0.28)';
    ctx.fillRect(0, 0, midX, h);

    // Right Phase: Lipid / Hydrocarbon (Non-polar)
    ctx.fillStyle = isLight ? 'rgba(251, 191, 36, 0.18)' : 'rgba(120, 53, 15, 0.32)';
    ctx.fillRect(midX, 0, w - midX, h);

    // Interface boundary line
    ctx.strokeStyle = isLight ? 'rgba(14, 165, 233, 0.9)' : 'rgba(56, 189, 248, 0.7)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Phase Headers
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = isLight ? '#0369a1' : '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText('💧 AQUEOUS PHASE (Water)', midX * 0.5, 18);

    ctx.fillStyle = isLight ? '#b45309' : '#fbbf24';
    ctx.fillText('🛡️ LIPID PHASE (Membrane)', midX + (w - midX) * 0.5, 18);

    // Draw Particles & Count per Phase
    let countWater = 0;
    let countLipid = 0;

    for (let p of this.partParticles) {
      if (p.x < midX) countWater++;
      else countLipid++;

      const isWaterSide = (p.x < midX);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

      if (isWaterSide) {
        ctx.fillStyle = isLight ? '#0284c7' : '#38bdf8';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      } else {
        ctx.fillStyle = isLight ? '#d97706' : '#f59e0b';
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      }
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Update real-time partition metrics in DOM
    const badgeNWater = document.getElementById('minisim-part-nwater');
    const badgeNLipid = document.getElementById('minisim-part-nlipid');
    const badgeKObs = document.getElementById('minisim-k-obs');
    const barWater = document.getElementById('minisim-split-water');
    const barLipid = document.getElementById('minisim-split-lipid');

    const total = countWater + countLipid;
    const pctWater = total > 0 ? (countWater / total * 100) : 50;
    const pctLipid = total > 0 ? (countLipid / total * 100) : 50;
    const kObs = countWater > 0 ? (countLipid / countWater) : this.targetK;

    if (badgeNWater) badgeNWater.textContent = countWater;
    if (badgeNLipid) badgeNLipid.textContent = countLipid;
    if (badgeKObs) badgeKObs.textContent = kObs.toFixed(2);
    if (barWater) barWater.style.width = `${pctWater.toFixed(1)}%`;
    if (barLipid) barLipid.style.width = `${pctLipid.toFixed(1)}%`;
  }

  /* =========================================================
     2. DIFFUSION COEFFICIENT (D) MINI-SIMULATOR
     ========================================================= */
  initDiffusionSim() {
    this.diffCanvas = document.getElementById('minisim-diffusion-canvas');
    if (!this.diffCanvas) return;
    this.diffCtx = this.diffCanvas.getContext('2d');
    this.diffW = this.diffCanvas.width;
    this.diffH = this.diffCanvas.height;

    this.diffRunning = true;
    this.diffParticles = [];
    this.numDiffParticles = 120;

    // Physical Parameters
    this.diffRadiusNm = 0.45; // nm (Ibuprofen rh)
    this.diffMedium = 'water'; // 'water' (0.69 cP), 'olive_oil' (40 cP), 'lipid' (90 cP)
    this.diffTempC = 37.0; // °C

    // Pulse / Drop Mode tracking
    this.pulseMode = false;
    this.pulseStartTime = 0;
    this.pulseElapsedSec = 0;

    this.resetDiffusionParticles(false);
    this.bindDiffusionControls();
  }

  computeDcm2s() {
    // Unified with main PhysicsEngine so numbers match between synthesis card and main sidebar
    if (this.mainPhysics) {
      const dummySpec = Object.assign({}, this.mainPhysics.params.soluteA, {
        radiusNm: this.diffRadiusNm,
        manualRadiusOverride: true
      });
      const { dWaterCm2s, dMemCm2s } = this.mainPhysics.computePhysicalDiffusivities(dummySpec, this.diffTempC);
      if (this.diffMedium === 'water') return dWaterCm2s;
      if (this.diffMedium === 'olive_oil') return dWaterCm2s * 0.018;
      return dMemCm2s;
    }

    const kB = 1.380649e-23;
    const T = this.diffTempC + 273.15;
    const rh_m = this.diffRadiusNm * 1e-9;
    let eta_Pas = 0.00069;
    if (this.diffMedium === 'olive_oil') eta_Pas = 0.040;
    else if (this.diffMedium === 'lipid') eta_Pas = 0.090;
    return ((kB * T) / (6 * Math.PI * eta_Pas * rh_m)) * 1e4;
  }

  resetDiffusionParticles(asPulse = false) {
    this.diffParticles = [];
    const centerX = this.diffW / 2;
    const centerY = this.diffH / 2;

    for (let i = 0; i < this.numDiffParticles; i++) {
      let x, y;
      if (asPulse) {
        const r = Math.random() * 8;
        const theta = Math.random() * Math.PI * 2;
        x = centerX + r * Math.cos(theta);
        y = centerY + r * Math.sin(theta);
      } else {
        x = Math.random() * (this.diffW - 20) + 10;
        y = Math.random() * (this.diffH - 20) + 10;
      }

      this.diffParticles.push({
        x, y,
        startX: x,
        startY: y,
        radius: Math.max(2.5, Math.min(6.5, this.diffRadiusNm * 5.0))
      });
    }

    this.pulseStartTime = performance.now();
    this.pulseElapsedSec = 0;
  }

  bindDiffusionControls() {
    const sliderRadius = document.getElementById('minisim-diff-radius');
    const badgeRadius = document.getElementById('minisim-diff-radius-val');
    const selectMedium = document.getElementById('minisim-diff-medium');
    const sliderTemp = document.getElementById('minisim-diff-temp');
    const badgeTemp = document.getElementById('minisim-diff-temp-val');
    const btnDrop = document.getElementById('minisim-diff-drop');
    const btnReset = document.getElementById('minisim-diff-reset');
    const btnPlay = document.getElementById('minisim-diff-play');

    if (sliderRadius) {
      sliderRadius.addEventListener('input', (e) => {
        this.diffRadiusNm = parseFloat(e.target.value);
        if (badgeRadius) badgeRadius.textContent = `${this.diffRadiusNm.toFixed(2)} nm`;
        this.updateDiffMetricsUI();
        this.updateSynthesisUI();
      });
    }

    if (selectMedium) {
      selectMedium.addEventListener('change', (e) => {
        this.diffMedium = e.target.value;
        this.updateDiffMetricsUI();
        this.updateSynthesisUI();
      });
    }

    if (sliderTemp) {
      sliderTemp.addEventListener('input', (e) => {
        this.diffTempC = parseFloat(e.target.value);
        if (badgeTemp) badgeTemp.textContent = `${this.diffTempC.toFixed(1)} °C`;
        this.updateDiffMetricsUI();
        this.updateSynthesisUI();
      });
    }

    if (btnDrop) {
      btnDrop.addEventListener('click', () => {
        this.pulseMode = true;
        this.resetDiffusionParticles(true);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.pulseMode = false;
        this.resetDiffusionParticles(false);
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        this.diffRunning = !this.diffRunning;
        btnPlay.textContent = this.diffRunning ? '⏸ Pause' : '▶ Play';
      });
    }

    this.updateDiffMetricsUI();
  }

  updateDiffMetricsUI() {
    const dVal = this.computeDcm2s();
    const badgeD = document.getElementById('minisim-d-val');
    const badgeEta = document.getElementById('minisim-diff-eta-desc');

    if (badgeD) {
      badgeD.textContent = `${dVal.toExponential(2)} cm²/s`;
    }

    if (badgeEta) {
      if (this.diffMedium === 'water') badgeEta.textContent = 'Water (η = 0.69 cP — low viscosity, rapid diffusion)';
      else if (this.diffMedium === 'olive_oil') badgeEta.textContent = 'Olive oil (η = 40 cP — intermediate viscosity)';
      else badgeEta.textContent = 'Lipid core (η = 90 cP — high viscosity, hindered diffusion)';
    }
  }

  updateDiffusionPhysics() {
    if (!this.diffRunning) return;

    const baseVisualStep = (this.diffMedium === 'water') ? 2.2 : (this.diffMedium === 'olive_oil' ? 0.75 : 0.40);
    const radiusFactor = Math.sqrt(0.45 / Math.max(0.1, this.diffRadiusNm));
    const tempFactor = Math.sqrt((this.diffTempC + 273.15) / 310.15);
    const stepSize = baseVisualStep * radiusFactor * tempFactor;

    const w = this.diffW;
    const h = this.diffH;

    for (let p of this.diffParticles) {
      const u1 = Math.max(1e-7, Math.random());
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

      p.x += z0 * stepSize;
      p.y += z1 * stepSize;

      if (p.x < p.radius) { p.x = p.radius; }
      if (p.x > w - p.radius) { p.x = w - p.radius; }
      if (p.y < p.radius) { p.y = p.radius; }
      if (p.y > h - p.radius) { p.y = h - p.radius; }
    }

    if (this.pulseMode) {
      this.pulseElapsedSec = (performance.now() - this.pulseStartTime) / 1000.0;
    }
  }

  drawDiffusionSim() {
    if (!this.diffCtx) return;
    const ctx = this.diffCtx;
    const w = this.diffW;
    const h = this.diffH;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    ctx.clearRect(0, 0, w, h);

    let bgFill = isLight ? 'rgba(241, 245, 249, 0.7)' : 'rgba(15, 23, 42, 0.5)';
    if (this.diffMedium === 'olive_oil') {
      bgFill = isLight ? 'rgba(254, 240, 138, 0.25)' : 'rgba(113, 63, 18, 0.25)';
    } else if (this.diffMedium === 'lipid') {
      bgFill = isLight ? 'rgba(253, 230, 138, 0.35)' : 'rgba(120, 53, 15, 0.35)';
    }
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, w, h);

    if (this.pulseMode) {
      const centerX = w / 2;
      const centerY = h / 2;
      const t = this.pulseElapsedSec;
      const visualRms = Math.min(w * 0.48, 12 + Math.sqrt(Math.max(0, t)) * 28 * (this.diffMedium === 'water' ? 2.5 : 0.8));

      ctx.save();
      ctx.strokeStyle = isLight ? 'rgba(13, 148, 136, 0.8)' : 'rgba(45, 212, 191, 0.8)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, visualRms, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = '500 10px JetBrains Mono, monospace';
      ctx.fillStyle = isLight ? '#0d9488' : '#2dd4bf';
      ctx.textAlign = 'center';
      ctx.fillText(`\u27E8r\u00B2\u27E9\u00BD = \u221A(4Dt) [t = ${t.toFixed(1)}s]`, centerX, centerY - visualRms - 5);
      ctx.restore();
    }

    const pColor = isLight ? '#0284c7' : '#38bdf8';
    ctx.fillStyle = pColor;
    for (let p of this.diffParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* =========================================================
     3. OVERTON SYNTHESIS MODULE: P = (K * D_mem) / d
     ========================================================= */
  initSynthesis() {
    this.updateSynthesisUI();

    const btnApply = document.getElementById('btn-apply-minisims-to-main');
    if (btnApply) {
      btnApply.addEventListener('click', () => {
        this.applyToMainSimulator();
      });
    }
  }

  updateSynthesisUI() {
    const K = this.targetK;
    let D_mem = 1.48e-10;
    if (this.mainPhysics) {
      const dummySpec = Object.assign({}, this.mainPhysics.params.soluteA, {
        partitionK: K,
        radiusNm: this.diffRadiusNm,
        manualRadiusOverride: true
      });
      D_mem = this.mainPhysics.computePhysicalDiffusivities(dummySpec, this.diffTempC).dMemCm2s;
    }

    const d_nm = (this.mainPhysics && this.mainPhysics.params.thicknessNm) || 3.9;
    const d_cm = d_nm * 1e-7;

    const P = (K * D_mem) / Math.max(1e-8, d_cm);
    const lagTau = (d_cm * d_cm) / (6 * Math.max(1e-18, D_mem));

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setTxt('synth-val-k', K.toFixed(2));
    setTxt('synth-val-d', `${D_mem.toExponential(2)} cm²/s`);
    setTxt('synth-val-thick', `${d_nm.toFixed(1)} nm`);
    setTxt('synth-val-p', `${P.toExponential(2)} cm/s`);
    setTxt('synth-val-tau', lagTau < 1 ? `${(lagTau * 1000).toFixed(1)} ms` : (lagTau < 60 ? `${lagTau.toFixed(1)} s` : `${(lagTau / 60).toFixed(1)} min`));
  }

  applyToMainSimulator() {
    if (!this.mainPhysics) return;

    this.mainPhysics.params.soluteA.partitionK = this.targetK;
    this.mainPhysics.params.soluteA.radiusNm = this.diffRadiusNm;
    this.mainPhysics.params.soluteA.manualRadiusOverride = true;
    this.mainPhysics.params.tempC = this.diffTempC;

    this.mainPhysics.rebuildDiffusionMap();
    this.mainPhysics.updateConcentrationFromPotential();
    if (this.mainControls) {
      this.mainControls.syncSlidersFromPhysics();
      this.mainControls.updateMetricsUI();
    }

    const canvasWrap = document.querySelector('.canvas-wrapper');
    if (canvasWrap) {
      canvasWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  step() {
    this.updatePartitionPhysics();
    this.drawPartitionSim();

    this.updateDiffusionPhysics();
    this.drawDiffusionSim();
  }
}
