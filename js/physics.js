/**
 * physics.js - 2D Membrane Diffusion & Permeability Physics Engine (Dual-Solute & Crystallization)
 * Solves coupled Fickian PDEs with partition jump conditions, cross-solute interaction,
 * solute-water solvation effects, solute-membrane affinity, and concentration-dependent
 * solubility limits with precipitation/crystallization kinetics and surface fouling.
 * Strictly guarantees mass conservation across closed boundary domains.
 */

class PhysicsEngine {
  constructor(nx = 160, ny = 50) {
    this.nx = nx;
    this.ny = ny;
    this.dx = 1.0;
    this.dy = 1.0;

    // Simulation state arrays for Solute A (Blue)
    this.C_A = new Float32Array(nx * ny);             // Free dissolved concentration C_free_A (mM)
    this.C_precip_A = new Float32Array(nx * ny);      // Crystalline precipitate concentration C_precip_A (mM)
    this.Cnext_A = new Float32Array(nx * ny);
    this.u_A = new Float32Array(nx * ny);             // Chemical potential u_A
    this.unext_A = new Float32Array(nx * ny);
    this.Dmap_A = new Float32Array(nx * ny);

    // Simulation state arrays for Solute B (Red)
    this.C_B = new Float32Array(nx * ny);             // Free dissolved concentration C_free_B (mM)
    this.C_precip_B = new Float32Array(nx * ny);      // Crystalline precipitate concentration C_precip_B (mM)
    this.Cnext_B = new Float32Array(nx * ny);
    this.u_B = new Float32Array(nx * ny);             // Chemical potential u_B
    this.unext_B = new Float32Array(nx * ny);
    this.Dmap_B = new Float32Array(nx * ny);

    // Fixed Source / Sink mask (-1: regular, 0: fixed source, 1: fixed sink)
    this.mask = new Int8Array(nx * ny).fill(-1);

    // Active visualization view filter: 'both' | 'A' | 'B'
    this.viewSolute = 'both';

    // Physics parameters & Solute Specs
    this.params = {
      regime: 'crystallization', // 'infinite_dilution' | 'crystallization'
      lipidPreset: 'popc',       // 'popc', 'popc_chol', 'dppc_gel', 'ecoli', 'sphingomyelin'
      tempC: 37.0,               // 37°C Human Body Temperature
      order: 0.60,               // POPC Lipid Order S
      fluidity: 0.55,            // POPC Membrane Fluidity
      thicknessNm: 3.9,          // Hydrophobic Core Thickness (3.9 nm)
      hasChannel: false,         // Transmembrane pore channel
      speedMultiplier: 1.0,

      // Cross-Solute Interaction (-1.0: Attraction/Co-transport, 0.0: Independent, +1.0: Crowding/Repulsion)
      interactAB: 0.25,

      // Solute A Parameters (Default: Lipophilic Ibuprofen, Blue)
      soluteA: {
        id: 'A',
        name: 'Ibuprofen',
        partitionK: 3.05,
        initialConc: 1.5,
        dBase25C: 2.30,
        soluteShape: 'disc',
        aspectRatio: 2.4,
        mwDa: 206,
        radiusNm: 0.45,
        hydration: 0.20,         // Solute-Water Interaction (low hydration)
        membraneAffinity: 0.85,  // Solute-Membrane Interaction (high hydrophobic affinity)
        solubilityLimit: 1.20,   // Saturation Concentration C_sat in mM
        crystRate: 0.15,         // Crystallization rate constant k_cryst (s^-1)
        dissolRate: 0.03,        // Dissolution rate constant k_dissol (s^-1)
        foulingFactor: 0.60,     // Surface fouling resistance factor r_cake
        color: '#0077ff'         // Blue theme
      },

      // Solute B Parameters (Default: Hydrophilic Caffeine/Glucose, Red)
      soluteB: {
        id: 'B',
        name: 'Caffeine',
        partitionK: 0.15,
        initialConc: 1.0,
        dBase25C: 2.10,
        soluteShape: 'sphere',
        aspectRatio: 1.0,
        mwDa: 194,
        radiusNm: 0.38,
        hydration: 0.65,         // Solute-Water Interaction (high solvation shell)
        membraneAffinity: 0.15,  // Solute-Membrane Interaction (low partition)
        solubilityLimit: 0.60,   // Saturation Concentration C_sat in mM
        crystRate: 0.12,         // Crystallization rate constant k_cryst (s^-1)
        dissolRate: 0.04,        // Dissolution rate constant k_dissol (s^-1)
        foulingFactor: 0.40,     // Surface fouling resistance factor r_cake
        color: '#ff3344'         // Red theme
      }
    };

    this.time = 0;
    this.dt = 0.12;

    // Membrane spatial boundaries (in grid units)
    this.memStart = 0;
    this.memEnd = 0;

    // Particles simulation array
    this.particles = [];
    this.maxParticles = 2400;

    // Historical tracking metrics
    this.timeHistory = [];
    this.fluxHistory = [];

    this.initGrid();
    this.resetScenario('default');
  }

  // Backward compatibility getters
  get C() { return this.viewSolute === 'B' ? this.C_B : this.C_A; }
  get u() { return this.viewSolute === 'B' ? this.u_B : this.u_A; }
  get Dmap() { return this.viewSolute === 'B' ? this.Dmap_B : this.Dmap_A; }

  initGrid() {
    this.updateMembraneGeometry();
    this.rebuildDiffusionMap();
  }

  getTemperatureFactor() {
    const tempC = this.params.tempC !== undefined ? this.params.tempC : 37.0;
    const T_kelvin = tempC + 273.15;
    return Math.exp(-2180 / T_kelvin + 2180 / 298.15);
  }

  getPerrinShapeFactor(shape, aspectRatio) {
    const p = Math.max(1.0, aspectRatio || 1.0);
    if (shape === 'sphere' || Math.abs(p - 1.0) < 0.02) return 1.0;
    if (shape === 'rod') {
      const num = Math.sqrt(p * p - 1.0);
      const den = Math.pow(p, 2.0 / 3.0) * Math.log(p + num);
      return num / Math.max(0.001, den);
    } else if (shape === 'disc') {
      const num = Math.sqrt(p * p - 1.0);
      const den = Math.pow(p, 2.0 / 3.0) * Math.atan(num);
      return num / Math.max(0.001, den);
    }
    return 1.0;
  }

  computeHydrodynamicRadius(soluteSpec) {
    const { mwDa, soluteShape, aspectRatio, radiusNm, hydration } = soluteSpec;
    if (soluteSpec.manualRadiusOverride) return radiusNm;
    const Req = 0.066 * Math.pow(Math.max(1, mwDa || 18), 1 / 3);
    const fShape = this.getPerrinShapeFactor(soluteShape, aspectRatio);
    const hydrationScale = 1.0 + 0.18 * (hydration || 0.0);
    return Req * fShape * hydrationScale;
  }

  updateMembraneGeometry() {
    const thicknessGrid = Math.round((this.params.thicknessNm / 10.0) * 44) + 8;
    const center = Math.floor(this.nx / 2);
    this.memStart = center - Math.floor(thicknessGrid / 2);
    this.memEnd = center + Math.ceil(thicknessGrid / 2);
  }

  buildDiffusionMapForSolute(soluteSpec, targetDmap, precipArray, otherConcentrationArray) {
    const { order, fluidity, hasChannel, regime, interactAB } = this.params;
    const chi = interactAB || 0.0;
    const baseD = soluteSpec.dBase25C || 2.30;
    const tempFactor = this.getTemperatureFactor();

    const rh = this.computeHydrodynamicRadius(soluteSpec);
    soluteSpec.radiusNm = rh;

    const radRatio = 0.17 / Math.max(0.08, rh);
    const fShape = this.getPerrinShapeFactor(soluteSpec.soluteShape, soluteSpec.aspectRatio);

    const memAffinity = soluteSpec.membraneAffinity !== undefined ? soluteSpec.membraneAffinity : 0.5;
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const gammaMem = 0.00016 * (0.5 + memAffinity);

    const dMemCm2s = (baseD * radRatio * tempFactor * 1e-5) * gammaMem * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
    const P = (soluteSpec.partitionK * dMemCm2s) / Math.max(1e-8, this.params.thicknessNm * 1e-7);

    const dWaterGrid = 8.0 / (1.0 + 0.3 * (soluteSpec.hydration || 0));
    const dMemGrid = Math.max(0.15, Math.min(6.0, P * 5000.0));

    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);
    const fouling = soluteSpec.foulingFactor || 0.5;

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        let localD = dWaterGrid;
        if (isChannel) {
          const poreCutoff = rh > 1.8 ? 0.15 : (rh > 1.2 ? 0.5 : 0.85);
          localD = dWaterGrid * poreCutoff;
        } else if (isMembrane) {
          localD = dMemGrid;
        }

        // Cross-solute interaction effect on local mobility (crowding reduces diffusivity, attraction facilitates)
        if (otherConcentrationArray && Math.abs(chi) > 1e-4) {
          const cOther = otherConcentrationArray[idx] || 0;
          if (cOther > 0.01) {
            localD = localD / (1.0 + 0.25 * Math.max(0, chi) * cOther);
          }
        }

        // Membrane Surface Fouling (Cake Resistance) if in crystallization regime
        if (regime === 'crystallization' && precipArray && (x >= this.memStart - 1 && x <= this.memStart + 1)) {
          const cPrecip = precipArray[idx] || 0;
          if (cPrecip > 0.05) {
            localD = localD / (1.0 + fouling * cPrecip * 1.5);
          }
        }

        targetDmap[idx] = localD;
      }
    }
  }

  rebuildDiffusionMap() {
    this.buildDiffusionMapForSolute(this.params.soluteA, this.Dmap_A, this.C_precip_A, this.C_B);
    this.buildDiffusionMapForSolute(this.params.soluteB, this.Dmap_B, this.C_precip_B, this.C_A);
  }

  updateConcentrationFromPotential() {
    const KA = Math.max(0.01, this.params.soluteA.partitionK);
    const KB = Math.max(0.01, this.params.soluteB.partitionK);
    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = this.params.hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        if (isMembrane && !isChannel) {
          this.C_A[idx] = KA * this.u_A[idx];
          this.C_B[idx] = KB * this.u_B[idx];
        } else {
          this.C_A[idx] = this.u_A[idx];
          this.C_B[idx] = this.u_B[idx];
        }
      }
    }
  }

  updatePotentialFromConcentration() {
    const KA = Math.max(0.01, this.params.soluteA.partitionK);
    const KB = Math.max(0.01, this.params.soluteB.partitionK);
    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = this.params.hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        if (isMembrane && !isChannel) {
          this.u_A[idx] = this.C_A[idx] / KA;
          this.u_B[idx] = this.C_B[idx] / KB;
        } else {
          this.u_A[idx] = this.C_A[idx];
          this.u_B[idx] = this.C_B[idx];
        }
      }
    }
  }

  resetScenario(preset = 'default') {
    this.time = 0;
    this.timeHistory = [];
    this.fluxHistory = [];

    this.C_A.fill(0);
    this.C_precip_A.fill(0);
    this.u_A.fill(0);

    this.C_B.fill(0);
    this.C_precip_B.fill(0);
    this.u_B.fill(0);

    this.mask.fill(-1);

    const c0A = this.params.soluteA.initialConc !== undefined ? this.params.soluteA.initialConc : 1.5;
    const c0B = this.params.soluteB.initialConc !== undefined ? this.params.soluteB.initialConc : 1.0;

    if (preset === 'lipophilic') {
      this.params.soluteA.partitionK = 3.5;
      this.params.soluteB.partitionK = 0.2;
    } else if (preset === 'hydrophilic') {
      this.params.soluteA.partitionK = 0.15;
      this.params.soluteB.partitionK = 0.10;
    } else if (preset === 'ordered_gel') {
      this.params.order = 0.90;
      this.params.fluidity = 0.15;
    } else if (preset === 'fluid_disordered') {
      this.params.order = 0.20;
      this.params.fluidity = 0.85;
    } else if (preset === 'transmembrane_channel') {
      this.params.hasChannel = true;
    }

    // Initialize donor compartment with Solute A and Solute B
    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.memStart; x++) {
        const idx = y * this.nx + x;
        this.C_A[idx] = c0A;
        this.u_A[idx] = c0A;
        this.C_B[idx] = c0B;
        this.u_B[idx] = c0B;
      }
    }

    this.updateMembraneGeometry();
    this.rebuildDiffusionMap();
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    this.syncParticlePopulationWithConcentration();
  }

  // Conservative 2-Way Gauss-Seidel Fickian Solver with exact zero-flux Neumann boundary conditions
  solveFickSubstep(uGrid, DmapGrid) {
    const nx = this.nx;
    const ny = this.ny;

    for (let y = 0; y < ny; y++) {
      const yAbove = (y > 0) ? y - 1 : -1;
      const yBelow = (y < ny - 1) ? y + 1 : -1;

      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;

        if (this.mask[idx] === 0) {
          uGrid[idx] = 1.0;
          continue;
        } else if (this.mask[idx] === 1) {
          uGrid[idx] = 0.0;
          continue;
        }

        const xLeft = (x > 0) ? x - 1 : -1;
        const xRight = (x < nx - 1) ? x + 1 : -1;

        const uCenter = uGrid[idx];
        const Dcenter = DmapGrid[idx];

        let sumWeight = 0;
        let sumWeightedU = 0;

        if (xLeft >= 0) {
          const D_L = 2.0 * Dcenter * DmapGrid[y * nx + xLeft] / (Dcenter + DmapGrid[y * nx + xLeft] + 1e-6);
          sumWeight += D_L;
          sumWeightedU += D_L * uGrid[y * nx + xLeft];
        }
        if (xRight >= 0) {
          const D_R = 2.0 * Dcenter * DmapGrid[y * nx + xRight] / (Dcenter + DmapGrid[y * nx + xRight] + 1e-6);
          sumWeight += D_R;
          sumWeightedU += D_R * uGrid[y * nx + xRight];
        }
        if (yAbove >= 0) {
          const D_A = 2.0 * Dcenter * DmapGrid[yAbove * nx + x] / (Dcenter + DmapGrid[yAbove * nx + x] + 1e-6);
          sumWeight += D_A;
          sumWeightedU += D_A * uGrid[yAbove * nx + x];
        }
        if (yBelow >= 0) {
          const D_B = 2.0 * Dcenter * DmapGrid[yBelow * nx + x] / (Dcenter + DmapGrid[yBelow * nx + x] + 1e-6);
          sumWeight += D_B;
          sumWeightedU += D_B * uGrid[yBelow * nx + x];
        }

        if (sumWeight < 1e-8) continue;

        const targetU = sumWeightedU / sumWeight;
        const decay = 1.0 - Math.exp(-sumWeight * 0.015);
        const val = uCenter + decay * (targetU - uCenter);
        uGrid[idx] = Number.isFinite(val) ? Math.max(0, Math.min(5.0, val)) : 0;
      }
    }
  }

  // Kinetics of precipitation / crystallization and dissolution with strict mass conservation
  applyCrystallizationKinetics(dt) {
    if (this.params.regime !== 'crystallization') {
      this.C_precip_A.fill(0);
      this.C_precip_B.fill(0);
      return;
    }

    const sA = this.params.soluteA;
    const sB = this.params.soluteB;

    const satA = Math.max(0.01, sA.solubilityLimit || 1.2);
    const kCrystA = sA.crystRate || 0.15;
    const kDissolA = sA.dissolRate || 0.03;

    const satB = Math.max(0.01, sB.solubilityLimit || 0.6);
    const kCrystB = sB.crystRate || 0.12;
    const kDissolB = sB.dissolRate || 0.04;

    const nx = this.nx;
    const ny = this.ny;

    for (let i = 0; i < nx * ny; i++) {
      // 1. Solute A kinetics
      const cFreeA = this.C_A[i];
      const cPrecipA = this.C_precip_A[i];

      if (cFreeA > satA) {
        const delta = cFreeA - satA;
        const rate = kCrystA * (delta / satA) * dt * 1.5;
        const toPrecip = Math.min(delta, rate);
        this.C_A[i] -= toPrecip;
        this.C_precip_A[i] += toPrecip;
      } else if (cFreeA < satA && cPrecipA > 0) {
        const capacity = satA - cFreeA;
        const toDissolve = Math.min(cPrecipA, Math.min(capacity, kDissolA * capacity * dt));
        this.C_A[i] += toDissolve;
        this.C_precip_A[i] -= toDissolve;
      }

      // 2. Solute B kinetics
      const cFreeB = this.C_B[i];
      const cPrecipB = this.C_precip_B[i];

      if (cFreeB > satB) {
        const delta = cFreeB - satB;
        const rate = kCrystB * (delta / satB) * dt * 1.5;
        const toPrecip = Math.min(delta, rate);
        this.C_B[i] -= toPrecip;
        this.C_precip_B[i] += toPrecip;
      } else if (cFreeB < satB && cPrecipB > 0) {
        const capacity = satB - cFreeB;
        const toDissolve = Math.min(cPrecipB, Math.min(capacity, kDissolB * capacity * dt));
        this.C_B[i] += toDissolve;
        this.C_precip_B[i] -= toDissolve;
      }
    }

    this.updatePotentialFromConcentration();
  }

  step(userSubsteps = 2) {
    const speed = Math.max(0.1, this.params.speedMultiplier);
    const dtFrame = (1 / 30.0) * speed;
    const numSubsteps = Math.min(96, Math.max(12, Math.round(12 * Math.pow(speed, 0.30))));

    for (let step = 0; step < numSubsteps; step++) {
      this.solveFickSubstep(this.u_A, this.Dmap_A);
      this.solveFickSubstep(this.u_B, this.Dmap_B);
    }

    this.updateConcentrationFromPotential();
    this.applyCrystallizationKinetics(dtFrame);
    this.rebuildDiffusionMap(); // Updates local diffusion with cross-interaction and cake resistance
    this.updateParticles(dtFrame);
    this.recordFluxMetrics();
    this.time += dtFrame;
  }

  updateParticles(dt) {
    const { order, fluidity, hasChannel, interactAB } = this.params;
    const nx = this.nx;
    const ny = this.ny;

    const channelYStart = Math.floor(ny * 0.42);
    const channelYEnd = Math.floor(ny * 0.58);

    for (let p of this.particles) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

      const spec = (p.type === 'B') ? this.params.soluteB : this.params.soluteA;
      p.angle = (p.angle || 0) + (p.rotSpeed || 0.1) * dt * 5.0 + (Math.random() - 0.5) * 0.08;

      const gx = Math.max(0, Math.min(nx - 1, Math.floor(p.x)));
      const gy = Math.max(0, Math.min(ny - 1, Math.floor(p.y)));
      const isMembrane = (gx >= this.memStart && gx < this.memEnd);
      const isChannel = hasChannel && isMembrane && (gy >= channelYStart && gy <= channelYEnd);

      const radRatio = 0.70 / Math.max(0.10, spec.radiusNm || 0.70);
      const dWaterEff = (spec.dBase25C || 1.0) * radRatio;

      let dLocal = dWaterEff;
      if (isChannel) {
        dLocal = dWaterEff * 0.85;
      } else if (isMembrane) {
        const orderFactor = Math.max(0.03, 1.0 - 0.82 * order);
        dLocal = dWaterEff * 0.05 * fluidity * orderFactor * (0.5 + (spec.membraneAffinity || 0.5));
      }

      const stepSize = Math.sqrt(2.0 * Math.max(0.01, dLocal) * dt) * 1.2;
      const randAngle = Math.random() * Math.PI * 2;

      let dx = Math.cos(randAngle) * stepSize;
      let dy = Math.sin(randAngle) * stepSize;

      if (isMembrane && !isChannel) {
        dx *= (1.0 - 0.7 * order);
      }

      // Solute-solute interaction force nudge
      if (Math.abs(interactAB) > 1e-3) {
        const otherC = (p.type === 'B') ? this.C_A[gy * nx + gx] : this.C_B[gy * nx + gx];
        if (otherC > 0.1) {
          dx += (Math.random() - 0.5) * interactAB * 0.4;
          dy += (Math.random() - 0.5) * interactAB * 0.4;
        }
      }

      let nextX = p.x + dx;
      let nextY = p.y + dy;

      const nextGx = Math.max(0, Math.min(nx - 1, Math.floor(nextX)));
      const nextIsMembrane = (nextGx >= this.memStart && nextGx < this.memEnd);

      const K = spec.partitionK;
      if (!isMembrane && nextIsMembrane && !isChannel) {
        if (Math.random() > Math.min(1.0, K)) nextX = p.x - dx * 0.6;
      } else if (isMembrane && !nextIsMembrane && !isChannel) {
        if (Math.random() > Math.min(1.0, 1.0 / Math.max(0.01, K))) nextX = p.x - dx * 0.6;
      }

      if (nextX < 1.5) nextX = 1.5 + (1.5 - nextX);
      if (nextX > nx - 2.5) nextX = (nx - 2.5) - (nextX - (nx - 2.5));
      if (nextY < 1.5) nextY = 1.5 + (1.5 - nextY);
      if (nextY > ny - 2.5) nextY = (ny - 2.5) - (nextY - (ny - 2.5));

      p.x = Math.max(1.5, Math.min(nx - 2.5, nextX));
      p.y = Math.max(1.5, Math.min(ny - 2.5, nextY));
    }

    this.syncParticlePopulationWithConcentration();
  }

  syncParticlePopulationWithConcentration() {
    const nx = this.nx;
    const ny = this.ny;

    const c1D_A = this.getProfile1D('A');
    const c1D_B = this.getProfile1D('B');

    const particlesA = this.particles.filter(p => p.type === 'A');
    const particlesB = this.particles.filter(p => p.type === 'B');

    const halfMax = Math.floor((this.maxParticles || 2400) / 2);

    this.syncSingleSoluteParticles(c1D_A, particlesA, 'A', '#0077ff', halfMax);
    this.syncSingleSoluteParticles(c1D_B, particlesB, 'B', '#ff3344', halfMax);
  }

  syncSingleSoluteParticles(c1D, currentParticles, type, color, maxAllowed) {
    const nx = this.nx;
    const ny = this.ny;

    const colParticles = Array.from({ length: nx }, () => []);
    for (let p of currentParticles) {
      const gx = Math.max(0, Math.min(nx - 1, Math.floor(p.x)));
      colParticles[gx].push(p);
    }

    const scaleFactor = 10.0;

    for (let x = 2; x < nx - 2; x++) {
      const targetInCol = Math.round(c1D[x] * scaleFactor);
      const currentInCol = colParticles[x].length;

      if (currentInCol < targetInCol && currentParticles.length < maxAllowed) {
        const needed = Math.min(targetInCol - currentInCol, maxAllowed - currentParticles.length);
        for (let k = 0; k < needed; k++) {
          let ry = Math.floor(Math.random() * ny);
          const pNew = {
            type: type,
            x: x + 0.1 + Math.random() * 0.8,
            y: ry + 0.1 + Math.random() * 0.8,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            radius: type === 'A' ? 3.5 : 3.0,
            color: color
          };
          this.particles.push(pNew);
          currentParticles.push(pNew);
        }
      } else if (currentInCol > targetInCol + 1) {
        let toRemove = currentInCol - targetInCol;
        const list = colParticles[x];
        for (let k = 0; k < toRemove && k < list.length; k++) {
          list[k]._markedForRemoval = true;
        }
      }
    }

    if (this.particles.some(p => p._markedForRemoval)) {
      this.particles = this.particles.filter(p => !p._markedForRemoval);
    }
  }

  recordFluxMetrics() {
    let rightMassA = 0, rightMassB = 0;
    let count = 0;
    for (let y = 0; y < this.ny; y++) {
      for (let x = this.memEnd; x < this.nx; x++) {
        rightMassA += this.C_A[y * this.nx + x];
        rightMassB += this.C_B[y * this.nx + x];
        count++;
      }
    }
    const avgRightConcA = count > 0 ? rightMassA / count : 0;
    const avgRightConcB = count > 0 ? rightMassB / count : 0;

    let instantFluxA = 0, instantFluxB = 0;
    if (this.fluxHistory.length > 0) {
      const prev = this.fluxHistory[this.fluxHistory.length - 1];
      const dt = 0.1;
      instantFluxA = Math.max(0, (avgRightConcA - (prev ? prev.concA : 0)) / dt);
      instantFluxB = Math.max(0, (avgRightConcB - (prev ? prev.concB : 0)) / dt);
    }

    if (this.timeHistory.length === 0 || this.time - this.timeHistory[this.timeHistory.length - 1] >= 0.25) {
      this.timeHistory.push(this.time);
      this.fluxHistory.push({
        concA: avgRightConcA,
        fluxA: instantFluxA,
        concB: avgRightConcB,
        fluxB: instantFluxB
      });
      if (this.timeHistory.length > 250) {
        this.timeHistory.shift();
        this.fluxHistory.shift();
      }
    }
  }

  getProfile1D(solute = 'A') {
    const profile = new Float32Array(this.nx);
    const grid = (solute === 'B') ? this.C_B : this.C_A;
    for (let x = 0; x < this.nx; x++) {
      let sum = 0;
      for (let y = 0; y < this.ny; y++) {
        sum += grid[y * this.nx + x];
      }
      profile[x] = sum / this.ny;
    }
    return profile;
  }

  getPrecipProfile1D(solute = 'A') {
    const profile = new Float32Array(this.nx);
    const grid = (solute === 'B') ? this.C_precip_B : this.C_precip_A;
    for (let x = 0; x < this.nx; x++) {
      let sum = 0;
      for (let y = 0; y < this.ny; y++) {
        sum += grid[y * this.nx + x];
      }
      profile[x] = sum / this.ny;
    }
    return profile;
  }

  calculateSingleSoluteMetrics(soluteSpec, precipGrid, freeGrid) {
    const { order, fluidity, thicknessNm, regime } = this.params;
    const baseD = soluteSpec.dBase25C || 2.30;
    const tempFactor = this.getTemperatureFactor();

    const rh = this.computeHydrodynamicRadius(soluteSpec);
    const fShape = this.getPerrinShapeFactor(soluteSpec.soluteShape, soluteSpec.aspectRatio);

    const radRatio = 0.17 / Math.max(0.08, rh);
    const dWaterCm2s = baseD * radRatio * tempFactor * 1e-5;

    const memAffinity = soluteSpec.membraneAffinity !== undefined ? soluteSpec.membraneAffinity : 0.5;
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const gammaMem = 0.00016 * (0.5 + memAffinity);

    const dMemCm2s = dWaterCm2s * gammaMem * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);

    const thicknessCm = thicknessNm * 1e-7;
    const P0 = (soluteSpec.partitionK * dMemCm2s) / thicknessCm;

    // Calculate total precipitated percentage
    let totalFree = 0, totalPrecip = 0;
    for (let i = 0; i < this.nx * this.ny; i++) {
      totalFree += freeGrid[i];
      totalPrecip += precipGrid[i];
    }
    const totalMass = totalFree + totalPrecip;
    const precipPct = totalMass > 0 ? (totalPrecip / totalMass) * 100 : 0;

    // Cake fouling resistance effect on effective permeability
    let cakeFactor = 1.0;
    if (regime === 'crystallization') {
      let surfacePrecip = 0;
      for (let y = 0; y < this.ny; y++) {
        surfacePrecip += precipGrid[y * this.nx + this.memStart];
      }
      surfacePrecip /= this.ny;
      cakeFactor = 1.0 + (soluteSpec.foulingFactor || 0.5) * surfacePrecip;
    }
    const P = P0 / cakeFactor;
    const logP = Math.log10(Math.max(1e-12, P));

    const lagTimePhys = (thicknessCm * thicknessCm) / Math.max(1e-18, 6 * dMemCm2s) * cakeFactor;

    const sat = soluteSpec.solubilityLimit || 1.0;
    const supersat = (soluteSpec.initialConc || 1.0) / sat;

    return {
      name: soluteSpec.name,
      dWaterCm2s: dWaterCm2s.toExponential(2),
      dMemCm2s: dMemCm2s.toExponential(2),
      P_val: P,
      P_str: P.toExponential(2),
      logP_val: logP,
      logP_str: logP.toFixed(2),
      lagTimePhys: lagTimePhys < 1 ? `${(lagTimePhys * 1000).toFixed(1)} ms` : `${lagTimePhys.toFixed(1)} s`,
      solubilityLimit: sat.toFixed(2),
      supersatRatio: supersat.toFixed(2),
      precipPct: precipPct.toFixed(1)
    };
  }

  getCalculatedMetrics() {
    const metricsA = this.calculateSingleSoluteMetrics(this.params.soluteA, this.C_precip_A, this.C_A);
    const metricsB = this.calculateSingleSoluteMetrics(this.params.soluteB, this.C_precip_B, this.C_B);

    return {
      regime: this.params.regime,
      tempC: (this.params.tempC || 37.0).toFixed(1),
      interactAB: (this.params.interactAB || 0).toFixed(2),
      soluteA: metricsA,
      soluteB: metricsB,
      dWater_str: `${metricsA.dWaterCm2s} cm\u00B2/s`,
      dMem_str: `${metricsA.dMemCm2s} cm\u00B2/s`,
      P_val: metricsA.P_val,
      P_str: metricsA.P_str,
      logP_val: metricsA.logP_val,
      logP_str: metricsA.logP_str,
      lagTime: metricsA.lagTimePhys
    };
  }

  paintSolute(gridX, gridY, radius, tool = 'source', solute = 'A') {
    const targetC = (solute === 'B') ? this.C_B : this.C_A;
    const targetU = (solute === 'B') ? this.u_B : this.u_A;
    const targetP = (solute === 'B') ? this.C_precip_B : this.C_precip_A;

    for (let y = Math.max(0, gridY - radius); y <= Math.min(this.ny - 1, gridY + radius); y++) {
      for (let x = Math.max(0, gridX - radius); x <= Math.min(this.nx - 1, gridX + radius); x++) {
        const dist = Math.hypot(x - gridX, y - gridY);
        if (dist <= radius) {
          const idx = y * this.nx + x;
          if (tool === 'source') {
            targetC[idx] = 1.5;
            targetU[idx] = 1.5;
          } else if (tool === 'sink' || tool === 'erase') {
            targetC[idx] = 0.0;
            targetU[idx] = 0.0;
            targetP[idx] = 0.0;
          }
        }
      }
    }
    this.updatePotentialFromConcentration();
  }
}
