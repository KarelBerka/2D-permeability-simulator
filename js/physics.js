/**
 * physics.js - 2D Membrane Diffusion & Permeability Physics Engine (Dual-Solute & Crystallization)
 * Solves coupled Fickian PDEs with partition jump conditions, cross-solute interaction,
 * solute-water solvation effects, solute-membrane affinity, and concentration-dependent
 * solubility limits with precipitation/crystallization kinetics and surface fouling.
 * Strictly guarantees mass conservation across closed boundary domains via finite-volume flux updates.
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

    // Separate Fixed Source / Sink masks (-1: regular, 0: fixed source, 1: fixed sink)
    this.mask_A = new Int8Array(nx * ny).fill(-1);
    this.mask_B = new Int8Array(nx * ny).fill(-1);
    this.mask = this.mask_A; // Backward compatibility alias

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
        manualRadiusOverride: false,
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
        manualRadiusOverride: false,
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
    this._sweepFlip = false;

    // Membrane spatial boundaries (in grid units)
    this.memStart = 0;
    this.memEnd = 0;

    // Particles simulation array
    this.particles = [];
    this.maxParticles = 2400;

    // Historical tracking metrics (decimated so t=0 is always preserved)
    this.timeHistory = [];
    this.fluxHistory = [];
    this.historySampleInterval = 0.15;

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

  getTemperatureFactor(tempOverrideC) {
    const tempC = tempOverrideC !== undefined ? tempOverrideC : (this.params.tempC !== undefined ? this.params.tempC : 37.0);
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

  // Unified physical diffusivity calculator used by both main engine and mini-simulators
  computePhysicalDiffusivities(soluteSpec, tempOverrideC) {
    const { order, fluidity } = this.params;
    const baseD = soluteSpec.dBase25C || 2.30;
    const tempFactor = this.getTemperatureFactor(tempOverrideC);

    const rh = this.computeHydrodynamicRadius(soluteSpec);
    soluteSpec.radiusNm = rh;

    const radRatio = 0.17 / Math.max(0.08, rh);
    const fShape = this.getPerrinShapeFactor(soluteSpec.soluteShape, soluteSpec.aspectRatio);
    const hydrationPenalty = 1.0 / (1.0 + 0.25 * (soluteSpec.hydration || 0));

    const dWaterCm2s = baseD * radRatio * tempFactor * hydrationPenalty * 1e-5;

    const memAffinity = soluteSpec.membraneAffinity !== undefined ? soluteSpec.membraneAffinity : 0.5;
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const gammaMem = 0.00016 * (0.5 + memAffinity);

    const dMemCm2s = dWaterCm2s * gammaMem * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
    return { rh, fShape, dWaterCm2s, dMemCm2s };
  }

  updateMembraneGeometry() {
    const thicknessGrid = Math.round((this.params.thicknessNm / 10.0) * 44) + 8;
    const center = Math.floor(this.nx / 2);
    this.memStart = center - Math.floor(thicknessGrid / 2);
    this.memEnd = center + Math.ceil(thicknessGrid / 2);
  }

  buildDiffusionMapForSolute(soluteSpec, targetDmap, precipArray, otherConcentrationArray) {
    const { hasChannel, regime, interactAB, thicknessNm } = this.params;
    const chi = interactAB || 0.0;
    const { rh, dWaterCm2s, dMemCm2s } = this.computePhysicalDiffusivities(soluteSpec);

    const thicknessGrid = Math.max(1, this.memEnd - this.memStart);
    const P = (soluteSpec.partitionK * dMemCm2s) / Math.max(1e-8, thicknessNm * 1e-7);

    // Physical scaling to grid units:
    // Aqueous mixing is rapid; membrane core diffusivity scales proportionally to physical D_mem and thickness
    const dWaterGrid = Math.max(0.5, Math.min(20.0, (dWaterCm2s / 1e-5) * 8.0));
    const dMemGrid = Math.max(0.002, Math.min(dWaterGrid * 0.8, P * 3200.0 * (thicknessGrid / 25.0) / Math.max(0.05, soluteSpec.partitionK)));

    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);
    const fouling = soluteSpec.foulingFactor !== undefined ? soluteSpec.foulingFactor : 0.5;

    // Precompute average surface cake precipitate along donor interface (x = memStart - 1 and memStart)
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

        // Cross-solute interaction effect on local mobility:
        // chi > 0: Steric crowding reduces diffusivity
        // chi < 0: Co-transport / mutual attraction enhances diffusivity
        if (otherConcentrationArray && Math.abs(chi) > 1e-4) {
          const cOther = otherConcentrationArray[idx] || 0;
          if (cOther > 0.005) {
            if (chi > 0) {
              localD = localD / (1.0 + 0.45 * chi * cOther);
            } else {
              localD = localD * (1.0 + 0.45 * Math.abs(chi) * Math.min(3.0, cOther));
            }
          }
        }

        // Membrane Surface Fouling (Cake Resistance) if in crystallization regime
        if (regime === 'crystallization' && precipArray && (x >= this.memStart - 2 && x <= this.memStart + 2)) {
          const cPrecipA = this.C_precip_A[y * this.nx + Math.max(0, this.memStart - 1)] + this.C_precip_A[y * this.nx + this.memStart];
          const cPrecipB = this.C_precip_B[y * this.nx + Math.max(0, this.memStart - 1)] + this.C_precip_B[y * this.nx + this.memStart];
          const localCake = (precipArray === this.C_precip_A ? cPrecipA : cPrecipB) + 0.35 * (precipArray === this.C_precip_A ? cPrecipB : cPrecipA);
          if (localCake > 0.01) {
            localD = localD / (1.0 + fouling * localCake * 2.5);
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

  recalculateDiffusivity() {
    this.rebuildDiffusionMap();
  }

  getCellK(x, y, K) {
    const isMembrane = (x >= this.memStart && x < this.memEnd);
    if (!isMembrane) return 1.0;
    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);
    const isChannel = this.params.hasChannel && (y >= channelYStart && y <= channelYEnd);
    return isChannel ? 1.0 : Math.max(0.01, K);
  }

  updateConcentrationFromPotential() {
    const KA = Math.max(0.01, this.params.soluteA.partitionK);
    const KB = Math.max(0.01, this.params.soluteB.partitionK);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const kCellA = this.getCellK(x, y, KA);
        const kCellB = this.getCellK(x, y, KB);
        this.C_A[idx] = kCellA * this.u_A[idx];
        this.C_B[idx] = kCellB * this.u_B[idx];
      }
    }
  }

  updatePotentialFromConcentration() {
    const KA = Math.max(0.01, this.params.soluteA.partitionK);
    const KB = Math.max(0.01, this.params.soluteB.partitionK);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const kCellA = this.getCellK(x, y, KA);
        const kCellB = this.getCellK(x, y, KB);
        this.u_A[idx] = this.C_A[idx] / kCellA;
        this.u_B[idx] = this.C_B[idx] / kCellB;
      }
    }
  }

  resetScenario(preset = 'default') {
    this.time = 0;
    this.timeHistory = [];
    this.fluxHistory = [];
    this.historySampleInterval = 0.15;

    this.C_A.fill(0);
    this.C_precip_A.fill(0);
    this.u_A.fill(0);

    this.C_B.fill(0);
    this.C_precip_B.fill(0);
    this.u_B.fill(0);

    this.mask_A.fill(-1);
    this.mask_B.fill(-1);

    if (preset === 'lipophilic') {
      this.params.soluteA.partitionK = 3.5;
      this.params.soluteB.partitionK = 0.2;
    } else if (preset === 'hydrophilic') {
      this.params.soluteA.partitionK = 0.15;
      this.params.soluteB.partitionK = 0.10;
    } else if (preset === 'ordered_gel') {
      this.params.lipidPreset = 'dppc_gel';
      this.params.order = 0.90;
      this.params.fluidity = 0.15;
    } else if (preset === 'fluid_disordered') {
      this.params.lipidPreset = 'popc';
      this.params.order = 0.20;
      this.params.fluidity = 0.85;
    } else if (preset === 'transmembrane_channel') {
      this.params.hasChannel = true;
    }

    const c0A = this.params.soluteA.initialConc !== undefined ? this.params.soluteA.initialConc : 1.5;
    const c0B = this.params.soluteB.initialConc !== undefined ? this.params.soluteB.initialConc : 1.0;

    this.updateMembraneGeometry();

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

    this.rebuildDiffusionMap();
    this.recordFluxMetrics(true);
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    this.syncParticlePopulationWithConcentration();
  }

  /**
   * Strictly Mass-Conserving Finite-Volume Fickian Substep with Symmetric Alternating Sweeps.
   * For each cell i, mass change is dC_i = dt_sub * sum_j D_face * (u_j - u_i),
   * and chemical potential is updated as u_i = C_i / K_i.
   * Because flux across face (i, j) is antisymmetric (J_ij = -J_ji), total mass sum(C_i) is conserved to machine precision.
   */
  solveFickSubstep(CGrid, uGrid, DmapGrid, K, maskGrid, otherUGrid, dtSub, reverseSweep = false) {
    const nx = this.nx;
    const ny = this.ny;
    const chi = this.params.interactAB || 0.0;
    const channelYStart = Math.floor(ny * 0.42);
    const channelYEnd = Math.floor(ny * 0.58);
    const hasChannel = this.params.hasChannel;
    const memStart = this.memStart;
    const memEnd = this.memEnd;
    const kVal = Math.max(0.01, K);
    const hasCross = (otherUGrid && Math.abs(chi) > 1e-4);
    const srcU = (K === this.params.soluteB.partitionK)
      ? (this.params.soluteB.initialConc || 1.5)
      : (this.params.soluteA.initialConc || 1.5);

    const yStart = reverseSweep ? ny - 1 : 0;
    const yEnd = reverseSweep ? -1 : ny;
    const yStep = reverseSweep ? -1 : 1;

    const xStart = reverseSweep ? nx - 1 : 0;
    const xEnd = reverseSweep ? -1 : nx;
    const xStep = reverseSweep ? -1 : 1;

    // 1. Horizontal faces (x <-> x + 1): strictly mass-conserving pairwise implicit exchange
    for (let y = yStart; y !== yEnd; y += yStep) {
      const inChannelY = hasChannel && (y >= channelYStart && y <= channelYEnd);
      for (let x = reverseSweep ? nx - 2 : 0; reverseSweep ? (x >= 0) : (x < nx - 1); x += xStep) {
        const idxL = y * nx + x;
        const idxR = idxL + 1;

        const DL = DmapGrid[idxL];
        const DR = DmapGrid[idxR];
        const Dface = (2.0 * DL * DR) / (DL + DR + 1e-8);
        if (Dface < 1e-8) continue;

        const kL = ((x >= memStart && x < memEnd) && !inChannelY) ? kVal : 1.0;
        const kR = (((x + 1) >= memStart && (x + 1) < memEnd) && !inChannelY) ? kVal : 1.0;

        const uL = uGrid[idxL];
        const uR = uGrid[idxR];

        let drivingForce = uR - uL;
        if (hasCross && (uL > 1e-5 || uR > 1e-5)) {
          const cAvg = 0.5 * (CGrid[idxL] + CGrid[idxR]);
          const satFactor = cAvg / (cAvg + 0.25);
          drivingForce += -0.08 * chi * satFactor * (otherUGrid[idxR] - otherUGrid[idxL]);
        }

        const denom = 1.0 + dtSub * Dface * (1.0 / kL + 1.0 / kR);
        let dM = (dtSub * Dface * drivingForce) / denom;

        // Clamp dM so neither cell goes negative
        if (dM > 0) {
          dM = Math.min(dM, 0.99 * CGrid[idxR]);
        } else if (dM < 0) {
          dM = Math.max(dM, -0.99 * CGrid[idxL]);
        }

        if (maskGrid[idxL] === -1) {
          CGrid[idxL] += dM;
          uGrid[idxL] = CGrid[idxL] / kL;
        }
        if (maskGrid[idxR] === -1) {
          CGrid[idxR] -= dM;
          uGrid[idxR] = CGrid[idxR] / kR;
        }
      }
    }

    // 2. Vertical faces (y <-> y + 1): strictly mass-conserving pairwise implicit exchange
    for (let y = reverseSweep ? ny - 2 : 0; reverseSweep ? (y >= 0) : (y < ny - 1); y += yStep) {
      const inChanA = hasChannel && (y >= channelYStart && y <= channelYEnd);
      const inChanB = hasChannel && ((y + 1) >= channelYStart && (y + 1) <= channelYEnd);
      for (let x = xStart; x !== xEnd; x += xStep) {
        const idxA = y * nx + x;
        const idxB = idxA + nx;

        const DA = DmapGrid[idxA];
        const DB = DmapGrid[idxB];
        const Dface = (2.0 * DA * DB) / (DA + DB + 1e-8);
        if (Dface < 1e-8) continue;

        const isMem = (x >= memStart && x < memEnd);
        const kA = (isMem && !inChanA) ? kVal : 1.0;
        const kB = (isMem && !inChanB) ? kVal : 1.0;

        const uA = uGrid[idxA];
        const uB = uGrid[idxB];

        let drivingForce = uB - uA;
        if (hasCross && (uA > 1e-5 || uB > 1e-5)) {
          const cAvg = 0.5 * (CGrid[idxA] + CGrid[idxB]);
          const satFactor = cAvg / (cAvg + 0.25);
          drivingForce += -0.08 * chi * satFactor * (otherUGrid[idxB] - otherUGrid[idxA]);
        }

        const denom = 1.0 + dtSub * Dface * (1.0 / kA + 1.0 / kB);
        let dM = (dtSub * Dface * drivingForce) / denom;

        if (dM > 0) {
          dM = Math.min(dM, 0.99 * CGrid[idxB]);
        } else if (dM < 0) {
          dM = Math.max(dM, -0.99 * CGrid[idxA]);
        }

        if (maskGrid[idxA] === -1) {
          CGrid[idxA] += dM;
          uGrid[idxA] = CGrid[idxA] / kA;
        }
        if (maskGrid[idxB] === -1) {
          CGrid[idxB] -= dM;
          uGrid[idxB] = CGrid[idxB] / kB;
        }
      }
    }

    // 3. Enforce persistent sources/sinks if any exist
    for (let y = 0; y < ny; y++) {
      const inChannelY = hasChannel && (y >= channelYStart && y <= channelYEnd);
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        const m = maskGrid[idx];
        if (m === -1) continue;
        const isMem = (x >= memStart && x < memEnd);
        const kCell = (isMem && !inChannelY) ? kVal : 1.0;
        if (m === 0) {
          uGrid[idx] = srcU;
          CGrid[idx] = kCell * srcU;
        } else if (m === 1) {
          uGrid[idx] = 0.0;
          CGrid[idx] = 0.0;
        }
      }
    }
  }

  /**
   * Kinetics of aqueous precipitation / crystallization, redissolution, and interfacial cake deposition.
   * Strictly conserves total mass (C_free + C_precip = const).
   * - Solubility limit C_sat applies in aqueous chambers (inside the hydrophobic membrane core, saturation scales by K * C_sat).
   * - Suspended micro-crystals in the donor chamber slowly drift/sediment toward the donor-membrane wall (x = memStart - 1),
   *   building a realistic physical cake layer over time.
   */
  applyCrystallizationKinetics(dt) {
    const nx = this.nx;
    const ny = this.ny;

    if (this.params.regime !== 'crystallization') {
      // If switching back to infinite dilution, return any precipitated crystals back to dissolved monomer so mass is conserved!
      for (let i = 0; i < nx * ny; i++) {
        if (this.C_precip_A[i] > 0) {
          this.C_A[i] += this.C_precip_A[i];
          this.C_precip_A[i] = 0;
        }
        if (this.C_precip_B[i] > 0) {
          this.C_B[i] += this.C_precip_B[i];
          this.C_precip_B[i] = 0;
        }
      }
      this.updatePotentialFromConcentration();
      return;
    }

    const sA = this.params.soluteA;
    const sB = this.params.soluteB;

    const satA = Math.max(0.05, sA.solubilityLimit !== undefined ? sA.solubilityLimit : 1.2);
    const kCrystA = sA.crystRate !== undefined ? sA.crystRate : 0.15;
    const kDissolA = sA.dissolRate !== undefined ? sA.dissolRate : 0.03;

    const satB = Math.max(0.05, sB.solubilityLimit !== undefined ? sB.solubilityLimit : 0.6);
    const kCrystB = sB.crystRate !== undefined ? sB.crystRate : 0.12;
    const kDissolB = sB.dissolRate !== undefined ? sB.dissolRate : 0.04;

    const KA = Math.max(0.01, sA.partitionK);
    const KB = Math.max(0.01, sB.partitionK);

    // 1. Local nucleation / crystallization and dissolution
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        const kCellA = this.getCellK(x, y, KA);
        const kCellB = this.getCellK(x, y, KB);

        // Local thermodynamic saturation threshold scales by kCell (so membrane interior saturation is K * C_sat)
        const localSatA = satA * kCellA;
        const localSatB = satB * kCellB;

        // Solute A
        const cFreeA = this.C_A[idx];
        const cPrecipA = this.C_precip_A[idx];
        if (cFreeA > localSatA && kCrystA > 0) {
          const delta = cFreeA - localSatA;
          const frac = 1.0 - Math.exp(-kCrystA * (1.0 + delta / localSatA) * dt);
          const toPrecip = delta * frac;
          this.C_A[idx] -= toPrecip;
          this.C_precip_A[idx] += toPrecip;
        } else if (cFreeA < localSatA && cPrecipA > 0) {
          const capacity = localSatA - cFreeA;
          const frac = 1.0 - Math.exp(-kDissolA * dt);
          const toDissolve = Math.min(cPrecipA, capacity * frac);
          this.C_A[idx] += toDissolve;
          this.C_precip_A[idx] -= toDissolve;
        }

        // Solute B
        const cFreeB = this.C_B[idx];
        const cPrecipB = this.C_precip_B[idx];
        if (cFreeB > localSatB && kCrystB > 0) {
          const delta = cFreeB - localSatB;
          const frac = 1.0 - Math.exp(-kCrystB * (1.0 + delta / localSatB) * dt);
          const toPrecip = delta * frac;
          this.C_B[idx] -= toPrecip;
          this.C_precip_B[idx] += toPrecip;
        } else if (cFreeB < localSatB && cPrecipB > 0) {
          const capacity = localSatB - cFreeB;
          const frac = 1.0 - Math.exp(-kDissolB * dt);
          const toDissolve = Math.min(cPrecipB, capacity * frac);
          this.C_B[idx] += toDissolve;
          this.C_precip_B[idx] -= toDissolve;
        }
      }
    }

    // 2. Interfacial convective / phoretic drift of suspended donor crystals toward the membrane wall (cake layer buildup)
    const driftRateA = Math.min(0.35, 0.06 * (sA.foulingFactor !== undefined ? sA.foulingFactor : 0.6) * dt);
    const driftRateB = Math.min(0.35, 0.06 * (sB.foulingFactor !== undefined ? sB.foulingFactor : 0.4) * dt);
    const wallX = Math.max(0, this.memStart - 1);

    if (driftRateA > 1e-6 || driftRateB > 1e-6) {
      for (let y = 0; y < ny; y++) {
        // Sweep from wallX - 1 down to 0 so mass shifts rightwards toward wallX without loss
        for (let x = wallX - 1; x >= 0; x--) {
          const idx = y * nx + x;
          const idxRight = y * nx + (x + 1);

          if (driftRateA > 0 && this.C_precip_A[idx] > 1e-5) {
            const moveA = this.C_precip_A[idx] * driftRateA;
            this.C_precip_A[idx] -= moveA;
            this.C_precip_A[idxRight] += moveA;
          }
          if (driftRateB > 0 && this.C_precip_B[idx] > 1e-5) {
            const moveB = this.C_precip_B[idx] * driftRateB;
            this.C_precip_B[idx] -= moveB;
            this.C_precip_B[idxRight] += moveB;
          }
        }
      }
    }

    this.updatePotentialFromConcentration();
  }

  step(userSubsteps = 2) {
    const speed = Math.max(0.1, this.params.speedMultiplier);
    const dtFrame = (1 / 30.0) * speed;

    // Scale substeps and per-substep timestep proportionally so physical time and diffusion progress stay 1:1 across all speed multipliers
    const numSubsteps = Math.min(160, Math.max(12, Math.ceil(12 * Math.sqrt(speed))));
    const dtSub = (dtFrame * 0.45) / numSubsteps;

    const KA = this.params.soluteA.partitionK;
    const KB = this.params.soluteB.partitionK;

    for (let s = 0; s < numSubsteps; s++) {
      const rev = ((s + (this._sweepFlip ? 1 : 0)) % 2 === 1);
      this.solveFickSubstep(this.C_A, this.u_A, this.Dmap_A, KA, this.mask_A, this.u_B, dtSub, rev);
      this.solveFickSubstep(this.C_B, this.u_B, this.Dmap_B, KB, this.mask_B, this.u_A, dtSub, rev);
    }
    this._sweepFlip = !this._sweepFlip;

    // Sub-step crystallization kinetics for stability at high speed multipliers
    const crystSteps = Math.min(20, Math.max(1, Math.ceil(dtFrame / 0.5)));
    const dtCryst = dtFrame / crystSteps;
    for (let c = 0; c < crystSteps; c++) {
      this.applyCrystallizationKinetics(dtCryst);
    }

    this.rebuildDiffusionMap(); // Updates local diffusion with cross-interaction and cake resistance
    this.updateParticles(Math.min(0.25, dtFrame));
    this.time += dtFrame;
    this.recordFluxMetrics(false);
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

  recordFluxMetrics(force = false) {
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

    const n = this.timeHistory.length;
    const lastTime = n > 0 ? this.timeHistory[n - 1] : -1;
    const actualDt = n > 0 ? (this.time - lastTime) : 0;

    if (!force && n > 0 && actualDt < this.historySampleInterval) {
      return;
    }

    let instantFluxA = 0, instantFluxB = 0;
    if (n > 0 && actualDt > 1e-6) {
      const prev = this.fluxHistory[n - 1];
      const rawFluxA = Math.max(0, (avgRightConcA - prev.concA) / actualDt);
      const rawFluxB = Math.max(0, (avgRightConcB - prev.concB) / actualDt);
      // Exponential smoothing for clean derivative display
      instantFluxA = prev.fluxA > 0 ? (0.65 * prev.fluxA + 0.35 * rawFluxA) : rawFluxA;
      instantFluxB = prev.fluxB > 0 ? (0.65 * prev.fluxB + 0.35 * rawFluxB) : rawFluxB;
    }

    this.timeHistory.push(this.time);
    this.fluxHistory.push({
      concA: avgRightConcA,
      fluxA: instantFluxA,
      concB: avgRightConcB,
      fluxB: instantFluxB
    });

    // Adaptive decimation: when history exceeds 400 points, keep every 2nd point (preserving t=0 and full history)
    if (this.timeHistory.length > 400) {
      const newTimes = [this.timeHistory[0]];
      const newFluxes = [this.fluxHistory[0]];
      for (let i = 2; i < this.timeHistory.length; i += 2) {
        newTimes.push(this.timeHistory[i]);
        newFluxes.push(this.fluxHistory[i]);
      }
      this.timeHistory = newTimes;
      this.fluxHistory = newFluxes;
      this.historySampleInterval *= 2.0;
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

  getPotentialProfile1D(solute = 'A') {
    const profile = new Float32Array(this.nx);
    const grid = (solute === 'B') ? this.u_B : this.u_A;
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

  getSurfaceCakeConcentration(solute = 'both') {
    if (this.params.regime !== 'crystallization') return 0;
    const wallX = Math.max(0, this.memStart - 1);
    let sumA = 0, sumB = 0;
    for (let y = 0; y < this.ny; y++) {
      sumA += this.C_precip_A[y * this.nx + wallX] + this.C_precip_A[y * this.nx + this.memStart];
      sumB += this.C_precip_B[y * this.nx + wallX] + this.C_precip_B[y * this.nx + this.memStart];
    }
    sumA /= this.ny;
    sumB /= this.ny;
    if (solute === 'A') return sumA;
    if (solute === 'B') return sumB;
    return sumA + sumB;
  }

  calculateSingleSoluteMetrics(soluteSpec, precipGrid, freeGrid, soluteKey = 'A') {
    const { thicknessNm, regime } = this.params;
    const { rh, fShape, dWaterCm2s, dMemCm2s } = this.computePhysicalDiffusivities(soluteSpec);

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
      const surfacePrecip = this.getSurfaceCakeConcentration(soluteKey);
      const fouling = soluteSpec.foulingFactor !== undefined ? soluteSpec.foulingFactor : 0.5;
      cakeFactor = 1.0 + fouling * surfacePrecip * 2.5;
    }
    const P = P0 / cakeFactor;
    const logP = Math.log10(Math.max(1e-12, P));

    const lagTimePhys = (thicknessCm * thicknessCm) / Math.max(1e-18, 6 * dMemCm2s) * cakeFactor;

    const sat = soluteSpec.solubilityLimit || 1.0;
    const supersat = (soluteSpec.initialConc || 1.0) / sat;

    return {
      name: soluteSpec.name,
      rhNm: rh.toFixed(2),
      fShape: fShape.toFixed(2),
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
    const metricsA = this.calculateSingleSoluteMetrics(this.params.soluteA, this.C_precip_A, this.C_A, 'A');
    const metricsB = this.calculateSingleSoluteMetrics(this.params.soluteB, this.C_precip_B, this.C_B, 'B');

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

  paintSolute(gridX, gridY, radius, tool = 'source', solute = 'both') {
    const applyToSolute = (sKey) => {
      const targetC = (sKey === 'B') ? this.C_B : this.C_A;
      const targetU = (sKey === 'B') ? this.u_B : this.u_A;
      const targetP = (sKey === 'B') ? this.C_precip_B : this.C_precip_A;
      const targetMask = (sKey === 'B') ? this.mask_B : this.mask_A;
      const spec = (sKey === 'B') ? this.params.soluteB : this.params.soluteA;
      const K = Math.max(0.01, spec.partitionK);
      const srcVal = spec.initialConc || 1.5;

      for (let y = Math.max(0, gridY - radius); y <= Math.min(this.ny - 1, gridY + radius); y++) {
        for (let x = Math.max(0, gridX - radius); x <= Math.min(this.nx - 1, gridX + radius); x++) {
          const dist = Math.hypot(x - gridX, y - gridY);
          if (dist <= radius) {
            const idx = y * this.nx + x;
            const kCell = this.getCellK(x, y, K);
            if (tool === 'source') {
              targetMask[idx] = 0; // Persistent fixed source
              targetU[idx] = srcVal;
              targetC[idx] = kCell * srcVal;
            } else if (tool === 'sink') {
              targetMask[idx] = 1; // Persistent fixed sink
              targetU[idx] = 0.0;
              targetC[idx] = 0.0;
              targetP[idx] = 0.0;
            } else if (tool === 'erase') {
              targetMask[idx] = -1; // Clear source/sink mask and local concentration
              targetU[idx] = 0.0;
              targetC[idx] = 0.0;
              targetP[idx] = 0.0;
            }
          }
        }
      }
    };

    if (solute === 'A' || solute === 'both') applyToSolute('A');
    if (solute === 'B' || solute === 'both') applyToSolute('B');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhysicsEngine;
}
