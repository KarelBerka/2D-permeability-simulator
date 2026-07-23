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
    this.Cnext = new Float32Array(nx * ny);   // Buffer for next timestep
    this.u = new Float32Array(nx * ny);       // Chemical potential u (continuous across interface)
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
      partitionK: 3.50,     // Ibuprofen MolMeDB MM00045 membrane partition K = 3.50
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

    // Membrane diffusion D_mem includes shape packing hindrance inside lipid bilayer core
    const fShape = this.getPerrinShapeFactor(soluteShape, aspectRatio);
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const dMem = dWaterEff * 0.05 * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);

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
          this.Dmap[idx] = dWaterEff * poreCutoff;
        } else if (isMembrane) {
          // Inside hydrophobic membrane slab: hat(D) = K * D_mem
          this.Dmap[idx] = partitionK * dMem;
        } else {
          // Aqueous reservoir
          this.Dmap[idx] = dWaterEff;
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

    if (preset === 'default' || preset === 'lipophilic' || preset === 'hydrophilic' || preset === 'ordered_gel' || preset === 'fluid_disordered' || preset === 'transmembrane_channel') {
      // Left reservoir filled with high concentration (1.0), right reservoir empty (0.0)
      for (let y = 0; y < this.ny; y++) {
        for (let x = 0; x < this.memStart; x++) {
          const idx = y * this.nx + x;
          this.C[idx] = 1.0;
          this.u[idx] = 1.0;
        }
      }
    } else if (preset === 'pulse_wave') {
      // Concentration wave pulse localized near left boundary
      const waveWidth = Math.floor(this.memStart * 0.4);
      for (let y = 0; y < this.ny; y++) {
        for (let x = 5; x < 5 + waveWidth; x++) {
          const idx = y * this.nx + x;
          this.C[idx] = 1.0;
          this.u[idx] = 1.0;
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
    // Spawn particles in areas with non-zero concentration
    for (let i = 0; i < 350; i++) {
      const px = Math.random() * (this.memStart - 4) + 2;
      const py = Math.random() * (this.ny - 4) + 2;
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
        radius: 3.5,
        color: '#00f2fe'
      });
    }
  }

  step(userSubsteps = 2) {
    const nx = this.nx;
    const ny = this.ny;

    // 1. Determine maximum diffusion coefficient across domain
    let maxD = 0.1;
    for (let i = 0; i < nx * ny; i++) {
      if (this.Dmap[i] > maxD) maxD = this.Dmap[i];
    }

    // 2. Strict 2D CFL stability upper bound: D * dt <= 0.15 (4 * D * dt <= 0.60 < 1.0)
    const safeDtLimit = 0.15 / Math.max(0.01, maxD);
    const speed = Math.max(0.1, this.params.speedMultiplier);
    const targetFrameDt = (1 / 30.0) * speed;

    // Execute sub-iterations with strict CFL safe dtSub (never exceed safeDtLimit)
    const maxSubsteps = 40;
    const numSubsteps = Math.min(maxSubsteps, Math.max(userSubsteps, Math.ceil(targetFrameDt / safeDtLimit)));
    const dtSub = Math.min(safeDtLimit, targetFrameDt / numSubsteps);
    const actualSimulatedTimeStep = numSubsteps * dtSub;

    for (let step = 0; step < numSubsteps; step++) {
      this.updatePotentialFromConcentration();

      // 2D Finite Difference stencil for PDE: du/dt = div( D_hat * grad(u) )
      for (let y = 0; y < ny; y++) {
        const yAbove = (y > 0) ? y - 1 : y; // Neumann no-flux boundary top/bottom
        const yBelow = (y < ny - 1) ? y + 1 : y;

        for (let x = 0; x < nx; x++) {
          const idx = y * nx + x;

          // Check if fixed source or sink mask
          if (this.mask[idx] === 0) {
            this.u[idx] = 1.0;
            continue;
          } else if (this.mask[idx] === 1) {
            this.u[idx] = 0.0;
            continue;
          }

          const xLeft = (x > 0) ? x - 1 : 0;
          const xRight = (x < nx - 1) ? x + 1 : nx - 1;

          const uCenter = this.u[idx];
          const Dcenter = this.Dmap[idx];

          // Harmonic mean diffusion across cell interfaces
          const D_L = 2.0 * Dcenter * this.Dmap[y * nx + xLeft] / (Dcenter + this.Dmap[y * nx + xLeft] + 1e-6);
          const D_R = 2.0 * Dcenter * this.Dmap[y * nx + xRight] / (Dcenter + this.Dmap[y * nx + xRight] + 1e-6);
          const D_A = 2.0 * Dcenter * this.Dmap[yAbove * nx + x] / (Dcenter + this.Dmap[yAbove * nx + x] + 1e-6);
          const D_B = 2.0 * Dcenter * this.Dmap[yBelow * nx + x] / (Dcenter + this.Dmap[yBelow * nx + x] + 1e-6);

          const fluxLeft  = (x > 0) ? D_L * (this.u[y * nx + xLeft] - uCenter) : 0;
          const fluxRight = (x < nx - 1) ? D_R * (this.u[y * nx + xRight] - uCenter) : 0;
          const fluxAbove = (y > 0) ? D_A * (this.u[yAbove * nx + x] - uCenter) : 0;
          const fluxBelow = (y < ny - 1) ? D_B * (this.u[yBelow * nx + x] - uCenter) : 0;

          const du = dtSub * (fluxLeft + fluxRight + fluxAbove + fluxBelow);
          const val = uCenter + du;
          // NaN Sanitizer & Clamping
          this.Cnext[idx] = Number.isFinite(val) ? Math.max(0, Math.min(5.0, val)) : 0;
        }
      }

      // Copy buffer back into potential array u
      for (let i = 0; i < nx * ny; i++) {
        if (this.mask[i] === -1) {
          this.u[i] = Number.isFinite(this.Cnext[i]) ? this.Cnext[i] : 0;
        }
      }

      this.updateConcentrationFromPotential();
      this.updateParticles(dtSub * Math.min(speed, 5.0));
      this.time += dtSub;
    }

    // 3. For ultra-high rates (speed > 60s/s), perform smooth spatial steady-state relaxation leap
    if (targetFrameDt > actualSimulatedTimeStep) {
      const remainingDt = targetFrameDt - actualSimulatedTimeStep;
      this.applySmoothRelaxationLeap(remainingDt);
      this.time += remainingDt;
    }

    // Record flux metrics into right reservoir
    this.recordFluxMetrics();
  }

  applySmoothRelaxationLeap(dtLeap) {
    const nx = this.nx;
    const ny = this.ny;
    const { memStart, memEnd } = this;
    const { order, fluidity, thicknessNm, partitionK, dBase, radiusNm } = this.params;

    // Calculate physical permeability P = K * D_mem / d
    const radRatio = 0.70 / Math.max(0.10, radiusNm);
    const dWaterEff = dBase * radRatio;
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const dMem = dWaterEff * 0.05 * fluidity * orderFactor * Math.pow(radRatio, 0.6);
    const P = (partitionK * dMem) / Math.max(0.1, thicknessNm * 0.1);

    // Permeability accumulation rate directly proportional to Partition Coefficient K and P
    const permRate = P * 0.015;

    // Smooth exponential relaxation towards steady-state linear profile
    for (let y = 0; y < ny; y++) {
      let donorSum = 0;
      let donorCount = 0;
      for (let x = 0; x < memStart; x++) {
        donorSum += this.u[y * nx + x];
        donorCount++;
      }
      const cDonor = donorCount > 0 ? donorSum / donorCount : 1.0;

      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        if (this.mask[idx] !== -1) continue;

        let targetU = 0;
        if (x < memStart) {
          targetU = cDonor;
        } else if (x >= memEnd) {
          // Solute accumulation into receiver chamber driven by Permeability P (and K)
          const currRec = this.u[idx];
          const accStep = (cDonor - currRec) * (1.0 - Math.exp(-permRate * dtLeap));
          targetU = Math.min(cDonor, currRec + accStep);
        } else {
          // Linear gradient across membrane slab
          const frac = (x - memStart) / (memEnd - memStart);
          const currRec = this.u[y * nx + memEnd] || 0;
          targetU = cDonor + frac * (currRec - cDonor);
        }

        const alpha = 1.0 - Math.exp(-Math.min(2.0, permRate * dtLeap * 2.0));
        const newU = this.u[idx] + alpha * (targetU - this.u[idx]);
        this.u[idx] = Number.isFinite(newU) ? Math.max(0, Math.min(5.0, newU)) : 0;
      }
    }
    this.updateConcentrationFromPotential();
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
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
        p.x = Math.random() * (this.memStart - 4) + 2;
        p.y = Math.random() * (ny - 4) + 2;
        p.angle = Math.random() * Math.PI * 2;
      }

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
          // Reflection off hydrophobic barrier (Low K)
          nextX = p.x - dx * 0.6;
        }
      } else if (isMembrane && !nextIsMembrane && !isChannel) {
        if (Math.random() > Math.min(1.0, 1.0 / Math.max(0.01, partitionK))) {
          // Trapping inside lipophilic core (High K)
          nextX = p.x - dx * 0.6;
        }
      }

      // Boundary checks
      p.x = Math.max(1, Math.min(nx - 2, nextX));
      p.y = Math.max(1, Math.min(ny - 2, nextY));
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
    const orderFactor = Math.max(0.02, 1.0 - 0.82 * order);
    const dMemCm2s = dWaterCm2s * 0.05 * fluidity * orderFactor * Math.pow(radRatio, 0.6) / Math.sqrt(fShape);
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

    // 6. Compute Theoretical Lag Time tau = d^2 / (6 * D_mem)
    const gridMemWidth = this.memEnd - this.memStart;
    const dGrid = Math.max(1, gridMemWidth);
    const dMemGrid = dMemCm2s * 1e5;
    const lagTimeSim = (dGrid * dGrid * 0.08) / Math.max(0.0001, 6 * dMemGrid);
    const sigmaLagSim = lagTimeSim * Math.sqrt(4 * fracErrD * fracErrD + fracErrS * fracErrS);

    const lagTimePhys = (thicknessCm * thicknessCm) / Math.max(1e-18, 6 * dMemCm2s);

    const formatLag = (tauSec) => {
      if (tauSec < 1e-3) {
        return `${(tauSec * 1e6).toFixed(1)} \u03BCs`;
      } else if (tauSec < 1.0) {
        return `${(tauSec * 1e3).toFixed(1)} ms`;
      } else if (tauSec < 3600) {
        return `${tauSec.toFixed(1)} s`;
      } else {
        return `${(tauSec / 3600).toFixed(1)} h`;
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
      lagTime: `${lagTimeSim.toFixed(1)} \u00B1 ${sigmaLagSim.toFixed(1)}`,
      lagTimePhys: formatLag(lagTimePhys),
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
