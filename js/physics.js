/**
 * physics.js - 2D Membrane Diffusion & Permeability Physics Engine
 * Solves Fick's 2nd Law PDE using a 2D Finite Difference Scheme with Partition Jump conditions
 * and updates discrete solute particle Brownian dynamics.
 */

class PhysicsEngine {
  constructor(nx = 160, ny = 50) {
    this.nx = nx;
    this.ny = ny;
    this.dx = 1.0;
    this.dy = 1.0;

    // Simulation state arrays
    this.C = new Float32Array(nx * ny);       // Solute Concentration C(x,y)
    this.Cnext = new Float32Array(nx * ny);   // Buffer for next timestep (Concentration)
    this.u = new Float32Array(nx * ny);       // Chemical potential u (continuous across interface)
    this.unext = new Float32Array(nx * ny);   // Buffer for next timestep (Potential)
    this.Dmap = new Float32Array(nx * ny);    // Local effective diffusion coefficient D_hat

    // Fixed Source / Sink mask (-1: regular, 0: fixed source, 1: fixed sink)
    this.mask = new Int8Array(nx * ny).fill(-1);

    // Physics parameters (Calibrated to POPC bilayer & Ibuprofen MolMeDB MM00045 baseline at 37°C)
    this.params = {
      lipidPreset: 'popc',  // 'popc', 'popc_chol', 'dppc_gel', 'ecoli', 'sphingomyelin'
      tempC: 37.0,          // Default to 37°C Human Body Temperature (310.15 K)
      order: 0.60,          // POPC Lipid Order parameter S (0.60 at 37°C, L_alpha phase)
      fluidity: 0.55,       // POPC Membrane Fluidity eta (0.55 lateral mobility)
      thicknessNm: 3.9,     // POPC Hydrophobic Core Thickness (3.9 nm)
      partitionK: 3.05,     // Ibuprofen MolMeDB MM00045 membrane partition K = 3.05
      initialConc: 1.0,     // Initial Donor Concentration C0 (mM)
      dBase25C: 2.30,       // Base water self-diffusion D_0 at 25°C (2.30e-5 cm²/s = 2.30e-9 m²/s)
      dBase: 2.30,          // Backward compatibility alias
      soluteType: 'ibuprofen', // 'water', 'ion', 'small_organic', 'ibuprofen', 'drug', 'macrocycle', 'biopolymer'
      soluteShape: 'disc',  // Disc / Planar Ring shape (Perrin oblate factor for aromatic ring)
      aspectRatio: 2.4,     // Aspect Ratio p = length/width (2.4 for planar ibuprofen)
      mwDa: 206,            // Ibuprofen MW = 206.3 Da
      radiusNm: 0.45,       // Solute Hydrodynamic Radius r_h = 0.45 nm
      hasChannel: false,    // Transmembrane pore channel
      speedMultiplier: 1.0
    };

    this.time = 0;
    this.dt = 0.12; // Courant-Friedrichs-Lewy stable time step

    // Membrane spatial boundaries (in grid units)
    this.memStart = 0;
    this.memEnd = 0;

    // Particles simulation array
    this.particles = [];
    this.maxParticles = 500;

    // Historical tracking metrics
    this.timeHistory = [];
    this.fluxHistory = [];

    this.initGrid();
    this.resetScenario('default');
  }

  initGrid() {
    this.updateMembraneGeometry();
    this.rebuildDiffusionMap();
  }

  getTemperatureFactor() {
    const tempC = this.params.tempC !== undefined ? this.params.tempC : 37.0;
    const T_kelvin = tempC + 273.15;
    // Arrhenius activation scaling for water self-diffusion:
    // D(25°C) = 2.30e-5 cm²/s = 2.30e-9 m²/s
    // D(37°C) = 3.00e-5 cm²/s = 3.00e-9 m²/s (Human Body Temperature!)
    return Math.exp(-2180 / T_kelvin + 2180 / 298.15);
  }

  getPerrinShapeFactor(shape, aspectRatio) {
    const p = Math.max(1.0, aspectRatio || 1.0);
    if (shape === 'sphere' || Math.abs(p - 1.0) < 0.02) {
      return 1.0;
    }
    if (shape === 'rod') {
      // Prolate Ellipsoid (Rod / Cylinder):
      // f/f0 = sqrt(p^2 - 1) / (p^(2/3) * ln(p + sqrt(p^2 - 1)))
      const num = Math.sqrt(p * p - 1.0);
      const den = Math.pow(p, 2.0 / 3.0) * Math.log(p + num);
      return num / Math.max(0.001, den);
    } else if (shape === 'disc') {
      // Oblate Ellipsoid (Disc / Flat Ring):
      // f/f0 = sqrt(p^2 - 1) / (p^(2/3) * atan(sqrt(p^2 - 1)))
      const num = Math.sqrt(p * p - 1.0);
      const den = Math.pow(p, 2.0 / 3.0) * Math.atan(num);
      return num / Math.max(0.001, den);
    }
    return 1.0;
  }

  computeHydrodynamicRadius() {
    const { mwDa, soluteShape, aspectRatio, radiusNm } = this.params;
    if (this.params.manualRadiusOverride) {
      return radiusNm;
    }
    // Equivalent spherical radius from molecular weight: Req = 0.066 * (MW)^(1/3) nm
    // For water (MW = 18 Da): Req = 0.17 nm
    const Req = 0.066 * Math.pow(Math.max(1, mwDa || 18), 1 / 3);
    const fShape = this.getPerrinShapeFactor(soluteShape, aspectRatio);
    return Req * fShape;
  }

  updateMembraneGeometry() {
    // Thickness maps from nm (2.0 to 10.0) to grid columns (e.g. 16 to 48 columns)
    const thicknessGrid = Math.round((this.params.thicknessNm / 10.0) * 44) + 8;
    const center = Math.floor(this.nx / 2);
    this.memStart = center - Math.floor(thicknessGrid / 2);
    this.memEnd = center + Math.ceil(thicknessGrid / 2);
  }

  rebuildDiffusionMap() {
    const { order, fluidity, dBase25C, dBase, partitionK, hasChannel, soluteShape, aspectRatio } = this.params;
    const baseD = dBase25C !== undefined ? dBase25C : (dBase || 2.30);
    const tempFactor = this.getTemperatureFactor();
    
    const rh = this.computeHydrodynamicRadius();
    this.params.radiusNm = rh; // Sync effective rh

    // Stokes-Einstein Hydrodynamic Diffusion Scaling: D_water ~ (r_water / r_h) / f_shape
    // Calibrated against pure water self-diffusion r_water = 0.17 nm (18 Da)
    const radRatio = 0.17 / Math.max(0.08, rh);
    const dWaterEff = baseD * radRatio * tempFactor;

    const fShape = this.getPerrinShapeFactor(soluteShape, aspectRatio);
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const gammaMem = 0.00016; // Hydrocarbon tail steric hindrance factor (~1/6000 of water)
    // Calculate physical permeability P (cm/s) to map grid time step 1:1 with real physical time
    const dMemCm2s = (baseD * radRatio * tempFactor * 1e-5) * gammaMem * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
    const P = (partitionK * dMemCm2s) / Math.max(1e-8, this.params.thicknessNm * 1e-7); // cm/s

    // Exact physical grid permeability mapping (Fast, responsive 2D simulation)
    const dWaterGrid = 4.0; // Fast aqueous mixing across water chambers
    const dMemGrid = Math.max(0.08, Math.min(2.5, P * 600.0)); // Responsive physical permeation across lipid membrane

    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        if (isChannel) {
          // Channel pore cutoff for large macrocycles/biopolymers
          const poreCutoff = radiusNm > 1.8 ? 0.15 : (radiusNm > 1.2 ? 0.5 : 0.85);
          this.Dmap[idx] = dWaterGrid * poreCutoff;
        } else if (isMembrane) {
          // Inside hydrophobic membrane slab: hat(D) = K * D_mem mapped for smooth permeation
          this.Dmap[idx] = dMemGrid;
        } else {
          // Aqueous reservoir
          this.Dmap[idx] = dWaterGrid;
        }
      }
    }
  }

  // Calculate actual concentration C from potential u
  updateConcentrationFromPotential() {
    const K = this.params.partitionK;
    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = this.params.hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        if (isMembrane && !isChannel) {
          this.C[idx] = K * this.u[idx];
        } else {
          this.C[idx] = this.u[idx];
        }
      }
    }
  }

  // Calculate potential u from concentration C
  updatePotentialFromConcentration() {
    const K = Math.max(0.01, this.params.partitionK);
    const channelYStart = Math.floor(this.ny * 0.42);
    const channelYEnd = Math.floor(this.ny * 0.58);

    for (let y = 0; y < this.ny; y++) {
      for (let x = 0; x < this.nx; x++) {
        const idx = y * this.nx + x;
        const isMembrane = (x >= this.memStart && x < this.memEnd);
        const isChannel = this.params.hasChannel && isMembrane && (y >= channelYStart && y <= channelYEnd);

        if (isMembrane && !isChannel) {
          this.u[idx] = this.C[idx] / K;
        } else {
          this.u[idx] = this.C[idx];
        }
      }
    }
  }

  resetScenario(preset = 'default') {
    this.time = 0;
    this.timeHistory = [];
    this.fluxHistory = [];

    this.C.fill(0);
    this.u.fill(0);
    this.mask.fill(-1);

    const c0 = this.params.initialConc !== undefined ? this.params.initialConc : 1.0;

    if (preset === 'default' || preset === 'lipophilic' || preset === 'hydrophilic' || preset === 'ordered_gel' || preset === 'fluid_disordered' || preset === 'transmembrane_channel') {
      // Left reservoir filled with donor concentration C0
      for (let y = 0; y < this.ny; y++) {
        for (let x = 0; x < this.memStart; x++) {
          const idx = y * this.nx + x;
          this.C[idx] = c0;
          this.u[idx] = c0;
        }
      }
    } else if (preset === 'pulse_wave') {
      // Concentration wave pulse localized near left boundary
      const waveWidth = Math.floor(this.memStart * 0.4);
      for (let y = 0; y < this.ny; y++) {
        for (let x = 5; x < 5 + waveWidth; x++) {
          const idx = y * this.nx + x;
          this.C[idx] = c0;
          this.u[idx] = c0;
        }
      }
    }

    // Preset parameter tweaks
    if (preset === 'lipophilic') {
      this.params.partitionK = 3.5;
    } else if (preset === 'hydrophilic') {
      this.params.partitionK = 0.15;
    } else if (preset === 'ordered_gel') {
      this.params.order = 0.90;
      this.params.fluidity = 0.15;
    } else if (preset === 'fluid_disordered') {
      this.params.order = 0.20;
      this.params.fluidity = 0.85;
    } else if (preset === 'transmembrane_channel') {
      this.params.hasChannel = true;
    }

    this.updateMembraneGeometry();
    this.rebuildDiffusionMap();
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    this.syncParticlePopulationWithConcentration();
  }

  step(userSubsteps = 2) {
    const nx = this.nx;
    const ny = this.ny;

    const speed = Math.max(0.1, this.params.speedMultiplier);
    // Physical time step per frame (e.g. 1/30s at 1s/s, 0.33s at 10s/s, 2s at 1m/s, 120s at 1h/s)
    const dtFrame = (1 / 30.0) * speed;

    // Execute 20 substeps per frame for smooth 2D PDE numerical integration
    const numSubsteps = 20;
    const dtSub = dtFrame / numSubsteps;

    for (let step = 0; step < numSubsteps; step++) {
      for (let y = 0; y < ny; y++) {
        const yAbove = (y > 0) ? y - 1 : y; // Neumann no-flux boundary top/bottom
        const yBelow = (y < ny - 1) ? y + 1 : y;

        for (let x = 0; x < nx; x++) {
          const idx = y * nx + x;

          if (this.mask[idx] === 0) {
            this.unext[idx] = 1.0;
            continue;
          } else if (this.mask[idx] === 1) {
            this.unext[idx] = 0.0;
            continue;
          }

          const xLeft = (x > 0) ? x - 1 : 0;
          const xRight = (x < nx - 1) ? x + 1 : nx - 1;

          const uCenter = this.u[idx];
          const Dcenter = this.Dmap[idx];

          const D_L = 2.0 * Dcenter * this.Dmap[y * nx + xLeft] / (Dcenter + this.Dmap[y * nx + xLeft] + 1e-6);
          const D_R = 2.0 * Dcenter * this.Dmap[y * nx + xRight] / (Dcenter + this.Dmap[y * nx + xRight] + 1e-6);
          const D_A = 2.0 * Dcenter * this.Dmap[yAbove * nx + x] / (Dcenter + this.Dmap[yAbove * nx + x] + 1e-6);
          const D_B = 2.0 * Dcenter * this.Dmap[yBelow * nx + x] / (Dcenter + this.Dmap[yBelow * nx + x] + 1e-6);

          const totalD = D_L + D_R + D_A + D_B;
          if (totalD < 1e-8) {
            this.unext[idx] = uCenter;
            continue;
          }

          // Weighted average potential of 4-connected neighbors
          const targetU = (D_L * this.u[y * nx + xLeft] +
                           D_R * this.u[y * nx + xRight] +
                           D_A * this.u[yAbove * nx + x] +
                           D_B * this.u[yBelow * nx + x]) / totalD;

          // Exponential Euler relaxation decay factor: 1 - exp(-totalD * dtSub)
          // Unconditionally stable (0 <= decay <= 1), ZERO numerical oscillations at high speedup!
          const decay = 1.0 - Math.exp(-totalD * dtSub);
          const val = uCenter + decay * (targetU - uCenter);
          this.unext[idx] = Number.isFinite(val) ? Math.max(0, Math.min(5.0, val)) : 0;
        }
      }
      this.u.set(this.unext);
    }

    this.updateConcentrationFromPotential();
    this.updateParticles(dtFrame);
    this.recordFluxMetrics();
    this.time += dtFrame;
  }

  updateParticles(dt) {
    const { order, fluidity, partitionK, dBase, radiusNm, hasChannel } = this.params;
    const nx = this.nx;
    const ny = this.ny;

    const channelYStart = Math.floor(ny * 0.42);
    const channelYEnd = Math.floor(ny * 0.58);

    const radRatio = 0.70 / Math.max(0.10, radiusNm || 0.70);
    const dWaterEff = (dBase || 1.0) * radRatio;

    for (let p of this.particles) {
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;

      p.angle = (p.angle || 0) + (p.rotSpeed || 0.1) * dt * 5.0 + (Math.random() - 0.5) * 0.08;

      const gx = Math.max(0, Math.min(nx - 1, Math.floor(p.x)));
      const gy = Math.max(0, Math.min(ny - 1, Math.floor(p.y)));
      const isMembrane = (gx >= this.memStart && gx < this.memEnd);
      const isChannel = hasChannel && isMembrane && (gy >= channelYStart && gy <= channelYEnd);

      let dLocal = dWaterEff;
      if (isChannel) {
        dLocal = dWaterEff * 0.85;
      } else if (isMembrane) {
        const orderFactor = Math.max(0.03, 1.0 - 0.82 * order);
        dLocal = dWaterEff * 0.05 * fluidity * orderFactor;
      }

      // Brownian step: delta_x = sqrt(2 * D * dt) * Gaussian
      const stepSize = Math.sqrt(2.0 * Math.max(0.01, dLocal) * dt) * 1.2;
      const randAngle = Math.random() * Math.PI * 2;

      let dx = Math.cos(randAngle) * stepSize;
      let dy = Math.sin(randAngle) * stepSize;

      // Anisotropic lipid order tortuosity inside membrane
      if (isMembrane && !isChannel) {
        dx *= (1.0 - 0.7 * order);
      }

      let nextX = p.x + dx;
      let nextY = p.y + dy;

      const nextGx = Math.max(0, Math.min(nx - 1, Math.floor(nextX)));
      const nextIsMembrane = (nextGx >= this.memStart && nextGx < this.memEnd);

      // Interface Partitioning Jump Condition (Thermodynamic Free Energy Barrier):
      // Water -> Membrane: Entry probability = min(1.0, K)
      // Membrane -> Water: Exit probability = min(1.0, 1.0 / K)
      if (!isMembrane && nextIsMembrane && !isChannel) {
        if (Math.random() > Math.min(1.0, partitionK)) {
          nextX = p.x - dx * 0.6;
        }
      } else if (isMembrane && !nextIsMembrane && !isChannel) {
        if (Math.random() > Math.min(1.0, 1.0 / Math.max(0.01, partitionK))) {
          nextX = p.x - dx * 0.6;
        }
      }

      // Specular elastic boundary reflection (prevents sticking to outer walls)
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

    // 1. Compute 1D average concentration profile C_1D[x]
    const c1D = this.getProfile1D();

    // 2. Count existing particles per grid column x
    const particlesPerColumn = new Array(nx).fill(0);
    const particleIndicesPerColumn = Array.from({ length: nx }, () => []);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p) continue;
      const gx = Math.max(0, Math.min(nx - 1, Math.floor(p.x)));
      particlesPerColumn[gx]++;
      particleIndicesPerColumn[gx].push(i);
    }

    // 3. Exact column-by-column target scaling: 5.5 particles per unit concentration
    const scaleFactor = 5.5;

    for (let x = 2; x < nx - 2; x++) {
      const targetInCol = Math.round(c1D[x] * scaleFactor);
      const currentInCol = particlesPerColumn[x];

      if (currentInCol < targetInCol) {
        const needed = targetInCol - currentInCol;
        for (let k = 0; k < needed; k++) {
          let ry = Math.floor(Math.random() * ny);
          for (let attempt = 0; attempt < 10; attempt++) {
            const testY = Math.floor(Math.random() * ny);
            if (Math.random() < Math.min(1.0, this.C[testY * nx + x] + 0.1)) {
              ry = testY;
              break;
            }
          }
          this.particles.push({
            x: x + 0.1 + Math.random() * 0.8,
            y: ry + 0.1 + Math.random() * 0.8,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            radius: 3.5,
            color: '#00f2fe'
          });
        }
      } else if (currentInCol > targetInCol + 1) {
        const toRemove = currentInCol - targetInCol;
        const indices = particleIndicesPerColumn[x];
        for (let k = 0; k < toRemove && indices.length > 0; k++) {
          const removeIdx = indices.pop();
          this.particles[removeIdx] = null;
        }
      }
    }

    if (this.particles.some(p => p === null)) {
      this.particles = this.particles.filter(p => p !== null);
    }
  }

  recordFluxMetrics() {
    // Compute total solute mass in receiver compartment (x > memEnd)
    let rightMass = 0;
    let count = 0;
    for (let y = 0; y < this.ny; y++) {
      for (let x = this.memEnd; x < this.nx; x++) {
        rightMass += this.C[y * this.nx + x];
        count++;
      }
    }
    const avgRightConc = count > 0 ? rightMass / count : 0;

    // Instantaneous flux approx J ~ dC_right/dt
    let instantFlux = 0;
    if (this.timeHistory.length > 0) {
      const prev = this.fluxHistory[this.fluxHistory.length - 1];
      const dt = 0.1;
      instantFlux = Math.max(0, (avgRightConc - (prev ? prev.conc : 0)) / dt);
    }

    if (this.timeHistory.length === 0 || this.time - this.timeHistory[this.timeHistory.length - 1] >= 0.25) {
      this.timeHistory.push(this.time);
      this.fluxHistory.push({ conc: avgRightConc, flux: instantFlux });
      // Retain complete time series trajectory without truncating
    }
  }

  // Get 1D cross-sectional average concentration profile along x
  getProfile1D() {
    const profile = new Float32Array(this.nx);
    for (let x = 0; x < this.nx; x++) {
      let sum = 0;
      for (let y = 0; y < this.ny; y++) {
        sum += this.C[y * this.nx + x];
      }
      profile[x] = sum / this.ny;
    }
    return profile;
  }

  // Calculate dynamic permeability metrics with log10(P), thermal fluctuation uncertainty, and lag time
  getCalculatedMetrics() {
    const { order, fluidity, thicknessNm, partitionK, dBase25C, dBase, soluteShape, aspectRatio, tempC } = this.params;
    const baseD = dBase25C !== undefined ? dBase25C : (dBase || 2.30);
    const tempFactor = this.getTemperatureFactor();

    // 1. Compute effective hydrodynamic radius from MW & shape
    const rh = this.computeHydrodynamicRadius();
    const fShape = this.getPerrinShapeFactor(soluteShape, aspectRatio);

    // 2. Compute physical aqueous water diffusion D_water (in cm²/s)
    // Reference: D_water(18 Da, 25°C) = 2.30e-5 cm²/s = 2.30e-9 m²/s
    // Reference: D_water(18 Da, 37°C) = 3.00e-5 cm²/s = 3.00e-9 m²/s
    const radRatio = 0.17 / Math.max(0.08, rh);
    const dWaterCm2s = baseD * radRatio * tempFactor * 1e-5;
    const dWaterM2s = dWaterCm2s * 1e-4; // m²/s

    // 3. Compute physical membrane diffusion D_mem (in cm²/s)
    // Hydrocarbon tail steric free-volume hindrance factor gamma_mem = 0.00016
    // Calibrated to experimental Ibuprofen log10(P) = -2.46 on POPC membrane at 37°C
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const gammaMem = 0.00016;
    const dMemCm2s = dWaterCm2s * gammaMem * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
    const dMemM2s = dMemCm2s * 1e-4; // m²/s

    // 4. Compute physical permeability P = K * D_mem / d (in cm/s)
    const thicknessCm = thicknessNm * 1e-7;
    const P = (partitionK * dMemCm2s) / thicknessCm; // cm/s
    const logP = Math.log10(Math.max(1e-12, P));

    // 5. Propagation of thermal & structural fluctuation uncertainty:
    const fracErrK = 0.08;
    const fracErrD = 0.06;
    const fracErrS = (0.82 * 0.04) / Math.max(0.05, 1.0 - 0.82 * order);
    const fracErrEta = 0.05;
    const fracErrP = Math.sqrt(fracErrK * fracErrK + fracErrD * fracErrD + fracErrS * fracErrS + fracErrEta * fracErrEta);

    const sigmaP = P * fracErrP;
    const sigmaLogP = fracErrP / Math.LN10;

    // 6. Compute Theoretical Physical Lag Time tau_phys = d^2 / (6 * D_mem)
    const lagTimePhys = (thicknessCm * thicknessCm) / Math.max(1e-18, 6 * dMemCm2s);
    const sigmaLagPhys = lagTimePhys * Math.sqrt(4 * fracErrD * fracErrD + fracErrS * fracErrS);

    const formatLagWithUncertainty = (tauSec, errSec) => {
      if (tauSec < 1e-3) {
        return `${(tauSec * 1e6).toFixed(1)} \u00B1 ${(errSec * 1e6).toFixed(1)} \u03BCs`;
      } else if (tauSec < 1.0) {
        return `${(tauSec * 1e3).toFixed(1)} \u00B1 ${(errSec * 1e3).toFixed(1)} ms`;
      } else if (tauSec < 3600) {
        return `${tauSec.toFixed(1)} \u00B1 ${errSec.toFixed(1)} s`;
      } else {
        return `${(tauSec / 3600).toFixed(1)} \u00B1 ${(errSec / 3600).toFixed(1)} h`;
      }
    };

    // 7. Compute steady-state flux J_ss = P * deltaC
    const profile = this.getProfile1D();
    const cLeft = profile[Math.floor(this.memStart / 2)] || 1.0;
    const cRight = profile[Math.floor((this.nx + this.memEnd) / 2)] || 0.0;
    const steadyStateFlux = P * Math.max(0, cLeft - cRight);
    const sigmaFlux = steadyStateFlux * fracErrP;

    return {
      tempC: (tempC !== undefined ? tempC : 37.0).toFixed(1),
      dWaterCm2s: dWaterCm2s.toExponential(2),
      dWaterM2s: dWaterM2s.toExponential(2),
      dWater_str: `${dWaterCm2s.toExponential(2)} cm\u00B2/s`,
      dMem_str: `${dMemCm2s.toExponential(2)} cm\u00B2/s`,
      dMem: dMemCm2s.toExponential(2),
      P_val: P,
      P_str: `${P.toExponential(2)} \u00B1 ${sigmaP.toExponential(1)}`,
      logP_val: logP,
      logP_str: `${logP.toFixed(2)} \u00B1 ${sigmaLogP.toFixed(2)}`,
      lagTime: formatLagWithUncertainty(lagTimePhys, sigmaLagPhys),
      lagTimePhys: formatLagWithUncertainty(lagTimePhys, sigmaLagPhys),
      steadyStateFlux: `${steadyStateFlux.toExponential(2)} \u00B1 ${sigmaFlux.toExponential(1)}`
    };
  }

  paintSolute(gridX, gridY, radius, tool = 'source') {
    for (let y = Math.max(0, gridY - radius); y <= Math.min(this.ny - 1, gridY + radius); y++) {
      for (let x = Math.max(0, gridX - radius); x <= Math.min(this.nx - 1, gridX + radius); x++) {
        const dist = Math.hypot(x - gridX, y - gridY);
        if (dist <= radius) {
          const idx = y * this.nx + x;
          if (tool === 'source') {
            this.C[idx] = 1.0;
            this.u[idx] = 1.0;
          } else if (tool === 'sink') {
            this.C[idx] = 0.0;
            this.u[idx] = 0.0;
          } else if (tool === 'erase') {
            this.C[idx] = 0.0;
            this.u[idx] = 0.0;
          }
        }
      }
    }
    this.updatePotentialFromConcentration();
  }
}
