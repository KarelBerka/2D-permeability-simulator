const PARAM_INFO_DICTIONARY = {
  'lipid-preset': {
    title: 'Lipid Membrane Composition (POPC Reference)',
    text: 'Selects experimental lipid membrane compositions. POPC (16:0-18:1 PC) is the standard liquid-disordered (L\u03B1) biological lipid bilayer baseline (Tm = -2\u00B0C). Adding 30% Cholesterol forms a rigid liquid-ordered (Lo) phase, while DPPC at 25\u00B0C represents an ordered gel (L\u03B2\') phase.',
    impact: 'DPPC gel or Cholesterol-dense membranes drastically increase chain packing order (S ~ 0.85), reducing permeability P by up to 50x.'
  },
  'temp': {
    title: 'Temperature (T)',
    text: 'System temperature in Celsius and Kelvin (default 37.0\u00B0C / 310.15 K human body temperature). Controls thermal kinetic energy (k_B T) and liquid viscosity.',
    impact: 'Higher temperature increases water self-diffusion (2.3e-5 cm\u00B2/s at 25\u00B0C -> 3.0e-5 cm\u00B2/s at 37\u00B0C), fluidizes lipid acyl chains (higher \u03B7, lower S), and accelerates permeation. Excessive heat (>45\u00B0C) destabilizes membrane structural order!'
  },
  'order': {
    title: 'Lipid Order Parameter (S)',
    text: 'Quantifies the average orientation of lipid acyl chains relative to the membrane normal (S = 0.1 for fluid L\u03B1 phase, S = 0.95 for rigid gel L\u03B2 phase). POPC reference at 37\u00B0C has S \u2248 0.60.',
    impact: 'Higher order aligns lipid tails tightly, creating a dense steric packing barrier that sharply lowers membrane diffusion D_mem and permeability P.'
  },
  'fluidity': {
    title: 'Membrane Fluidity (\u03B7)',
    text: 'Measures lateral mobility, free volume, and rotational flexibility within the hydrophobic lipid core.',
    impact: 'Higher fluidity increases free-volume cavity formation inside the membrane core, accelerating solute translocation.'
  },
  'thickness': {
    title: 'Membrane Thickness (d)',
    text: 'Distance across the hydrophobic lipid bilayer core (typically 3.9 - 4.5 nm for POPC bilayers).',
    impact: 'Thicker membranes increase diffusion path length. Permeability scales inversely (P = K\u00B7D_mem / d), while theoretical lag time increases quadratically (\u03C4 = d\u00B2 / 6D_mem).'
  },
  'solute-type': {
    title: 'Solute Category & Molecular Weight (MW)',
    text: 'Categorizes solutes from tiny water molecules (18 Da) up to large biopolymers (3000 Da).',
    impact: 'Larger molecular weight increases equivalent hydrodynamic radius (Req \u221D MW^(1/3)), increasing hydrodynamic drag in water and steric hindrance inside lipid tails.'
  },
  'solute-shape': {
    title: 'Molecular Shape Geometry',
    text: 'Sets molecular geometry (Sphere, Rod, or Disc). Hydrodynamic drag is governed by Perrin ellipsoid friction theory (f_shape).',
    impact: 'Rods and flat discs experience higher friction drag (f_shape > 1.0) than isometric spheres, slowing water diffusion and membrane permeation.'
  },
  'aspect-ratio': {
    title: 'Aspect Ratio (p = a/b)',
    text: 'Length-to-width ratio of prolate (rod) or oblate (disc) ellipsoids (p = 1.0 for spheres, p = 4.0 for elongated rods/discs).',
    impact: 'Higher aspect ratio increases Perrin drag factor f_shape, slowing overall diffusion speed.'
  },
  'radius': {
    title: 'Hydrodynamic Radius (r_h)',
    text: 'Effective Stokes-Einstein radius of the solute molecule in solution.',
    impact: 'Aqueous diffusion scales inversely with r_h (D_water \u221D 1/r_h). Inside lipid core, larger radius faces additional steric hindrance.'
  },
  'partition': {
    title: 'Partition Coefficient (K = C_mem / C_water)',
    text: 'Thermodynamic equilibrium ratio of solute concentration inside hydrophobic lipid core relative to water (Overton\'s Rule).',
    impact: 'Lipophilic compounds (K > 1) dissolve strongly into lipid core, creating high concentration gradient and accelerating steady-state flux J_ss.'
  },
  'channel': {
    title: 'Transmembrane Pore Channel',
    text: 'Inserts an aqueous protein pore across the hydrophobic lipid membrane slab.',
    impact: 'Allows hydrophilic or charged solutes (low K) to bypass the hydrophobic lipid core and diffuse rapidly through the aqueous pore.'
  }
};

class ControlsManager {
  constructor(physics, render, charts) {
    this.physics = physics;
    this.render = render;
    this.charts = charts;

    this.isMouseDown = false;
    this.activePaintTool = 'source'; // 'source', 'sink', 'erase'
    this.isLogPMode = false;

    this.initEventListeners();
    this.updateMetricsUI();
  }

  initEventListeners() {
    // 1. Presets Selector
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        this.physics.resetScenario(e.target.value);
        this.syncSlidersFromPhysics();
        this.updateMetricsUI();
      });
    }

    // Reset button
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const currentPreset = presetSelect ? presetSelect.value : 'default';
        this.physics.resetScenario(currentPreset);
        this.updateMetricsUI();
      });
    }

    // Lipid Membrane Presets (POPC Baseline Reference)
    const lipidPresets = {
      popc:          { order: 0.60, fluidity: 0.55, thickness: 3.9, temp: 37.0 },
      popc_chol:     { order: 0.82, fluidity: 0.35, thickness: 4.3, temp: 37.0 },
      dppc_gel:      { order: 0.88, fluidity: 0.10, thickness: 4.7, temp: 25.0 },
      ecoli:         { order: 0.68, fluidity: 0.45, thickness: 4.1, temp: 37.0 },
      sphingomyelin: { order: 0.78, fluidity: 0.25, thickness: 6.0, temp: 37.0 }
    };

    const selectLipidPreset = document.getElementById('select-lipid-preset');
    if (selectLipidPreset) {
      selectLipidPreset.addEventListener('change', (e) => {
        const lp = lipidPresets[e.target.value] || lipidPresets.popc;
        this.physics.params.lipidPreset = e.target.value;
        this.physics.params.order = lp.order;
        this.physics.params.fluidity = lp.fluidity;
        this.physics.params.thicknessNm = lp.thickness;
        this.physics.params.tempC = lp.temp;
        this.physics.updateMembraneGeometry();
        this.physics.rebuildDiffusionMap();
        this.syncSlidersFromPhysics();
        this.updateMetricsUI();
      });
    }

    // Parameter Info Modal System (i Buttons)
    const infoModalBackdrop = document.getElementById('info-modal-backdrop');
    const infoModalClose = document.getElementById('info-modal-close');
    const infoModalHeading = document.getElementById('info-modal-heading');
    const infoModalText = document.getElementById('info-modal-text');
    const infoModalImpact = document.getElementById('info-modal-impact');

    const openInfoModal = (paramKey) => {
      const data = PARAM_INFO_DICTIONARY[paramKey];
      if (data && infoModalBackdrop) {
        if (infoModalHeading) infoModalHeading.textContent = data.title;
        if (infoModalText) infoModalText.textContent = data.text;
        if (infoModalImpact) infoModalImpact.textContent = data.impact;
        infoModalBackdrop.classList.remove('hidden');
      }
    };

    const closeInfoModal = () => {
      if (infoModalBackdrop) infoModalBackdrop.classList.add('hidden');
    };

    document.querySelectorAll('.info-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const paramKey = btn.getAttribute('data-info');
        openInfoModal(paramKey);
      });
    });

    if (infoModalClose) infoModalClose.addEventListener('click', closeInfoModal);
    if (infoModalBackdrop) {
      infoModalBackdrop.addEventListener('click', (e) => {
        if (e.target === infoModalBackdrop) closeInfoModal();
      });
    }

    // 2. Solute Category & Size Controls
    const solutePresets = {
      water:        { mw: 18,   radius: 0.15, partitionK: 0.20, label: '18 Da' },
      ion:          { mw: 30,   radius: 0.25, partitionK: 0.05, label: '30 Da' },
      small_organic:{ mw: 100,  radius: 0.40, partitionK: 0.80, label: '100 Da' },
      drug:         { mw: 300,  radius: 0.70, partitionK: 1.20, label: '300 Da' },
      macrocycle:   { mw: 1000, radius: 1.20, partitionK: 2.20, label: '1000 Da' },
      biopolymer:   { mw: 3000, radius: 2.00, partitionK: 0.10, label: '3000 Da' }
    };

    const selectSoluteType = document.getElementById('select-solute-type');
    if (selectSoluteType) {
      selectSoluteType.addEventListener('change', (e) => {
        const cat = solutePresets[e.target.value] || solutePresets.drug;
        this.physics.params.soluteType = e.target.value;
        this.physics.params.mwDa = cat.mw;
        this.physics.params.radiusNm = cat.radius;
        this.physics.params.partitionK = cat.partitionK;

        this.syncSlidersFromPhysics();
        this.physics.rebuildDiffusionMap();
        this.updateMetricsUI();
      });
    }

    // Solute Shape Selector & Aspect Ratio Slider
    const selectSoluteShape = document.getElementById('select-solute-shape');
    if (selectSoluteShape) {
      selectSoluteShape.addEventListener('change', (e) => {
        this.physics.params.soluteShape = e.target.value;
        this.physics.params.manualRadiusOverride = false;
        this.physics.rebuildDiffusionMap();
        this.syncSlidersFromPhysics();
        this.updateMetricsUI();
      });
    }

    this.bindSlider('slider-aspect', 'val-aspect', (val) => {
      this.physics.params.aspectRatio = parseFloat(val);
      this.physics.params.manualRadiusOverride = false;
      this.physics.rebuildDiffusionMap();
      this.syncSlidersFromPhysics();
    }, (val) => {
      const p = parseFloat(val);
      const shape = this.physics.params.soluteShape || 'sphere';
      if (shape === 'sphere' || p <= 1.05) return '1.0 (Sphere)';
      return `${p.toFixed(1)} (${shape === 'rod' ? 'Rod' : 'Disc'})`;
    });

    this.bindSlider('slider-radius', 'val-radius', (val) => {
      this.physics.params.radiusNm = parseFloat(val);
      this.physics.params.manualRadiusOverride = true;
      this.physics.rebuildDiffusionMap();
    }, (val) => `${parseFloat(val).toFixed(2)} nm`);

    // Temperature Control Slider
    this.bindSlider('slider-temp', 'val-temp', (val) => {
      this.physics.params.tempC = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    }, (val) => {
      const c = parseFloat(val);
      const k = (c + 273.15).toFixed(2);
      return `${c.toFixed(1)} \u00B0C (${k} K)`;
    });

    // 3. Membrane & Physics Sliders
    this.bindSlider('slider-order', 'val-order', (val) => {
      this.physics.params.order = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-fluidity', 'val-fluidity', (val) => {
      this.physics.params.fluidity = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-thickness', 'val-thickness', (val) => {
      this.physics.params.thicknessNm = parseFloat(val);
      this.physics.updateMembraneGeometry();
      this.physics.rebuildDiffusionMap();
    }, (val) => `${parseFloat(val).toFixed(1)} nm`);

    this.bindSlider('slider-partition', 'val-partition', (val) => {
      this.physics.params.partitionK = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-dwater', 'val-dwater', (val) => {
      this.physics.params.dBase = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    }, (val) => `${parseFloat(val).toFixed(2)} cm²/s`);

    // Channel Pore Checkbox
    const chkChannel = document.getElementById('chk-channel');
    if (chkChannel) {
      chkChannel.addEventListener('change', (e) => {
        this.physics.params.hasChannel = e.target.checked;
        this.physics.rebuildDiffusionMap();
        this.updateMetricsUI();
      });
    }

    // 3. View Mode Toggles
    const btnMacro = document.getElementById('mode-macro');
    const btnMicro = document.getElementById('mode-micro');

    if (btnMacro && btnMicro) {
      btnMacro.addEventListener('click', () => {
        btnMacro.classList.add('active');
        btnMicro.classList.remove('active');
        this.render.viewMode = 'macro';
      });

      btnMicro.addEventListener('click', () => {
        btnMicro.classList.add('active');
        btnMacro.classList.remove('active');
        this.render.viewMode = 'micro';
      });
    }

    // 4. Paint Tool Selection
    const toolButtons = document.querySelectorAll('.btn-tool');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activePaintTool = btn.dataset.tool;
      });
    });

    // 5. Canvas Painting Interaction
    const canvas = this.render.canvas;
    canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.handleCanvasPaint(e);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isMouseDown) {
        this.handleCanvasPaint(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // 6. Colormap Selector
    const colorSelect = document.getElementById('color-palette');
    if (colorSelect) {
      colorSelect.addEventListener('change', (e) => {
        this.render.setColormap(e.target.value);
      });
    }

    // 7. Toggles
    const chkIsolines = document.getElementById('chk-isolines');
    if (chkIsolines) {
      chkIsolines.addEventListener('change', (e) => {
        this.render.showIsolines = e.target.checked;
      });
    }

    const chkParticles = document.getElementById('chk-particles');
    if (chkParticles) {
      chkParticles.addEventListener('change', (e) => {
        this.render.showParticles = e.target.checked;
      });
    }

    // 8. Rate Controls & Preset Speedup Buttons (1s, 10s, 1min, 10min, 1h per sec)
    const speedSlider = document.getElementById('sim-speed');
    const speedValDisplay = document.getElementById('speed-val');

    const updateRate = (rateSecPerSec) => {
      this.physics.params.speedMultiplier = rateSecPerSec;

      let displayStr = `${rateSecPerSec.toFixed(0)}s/s`;
      if (rateSecPerSec >= 3600) {
        displayStr = `${(rateSecPerSec / 3600).toFixed(1)}h/s`;
      } else if (rateSecPerSec >= 60) {
        displayStr = `${(rateSecPerSec / 60).toFixed(1)}m/s`;
      }

      if (speedValDisplay) speedValDisplay.textContent = displayStr;

      // Update preset button active states
      document.querySelectorAll('.btn-speed-preset').forEach((btn) => {
        const btnRate = parseFloat(btn.dataset.rate);
        if (Math.abs(btnRate - rateSecPerSec) < 0.5) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    };

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const sliderVal = parseFloat(e.target.value);
        // Exponential scale mapping from slider 1..100 to rate 1s/s .. 3600s/s
        const rate = Math.pow(3600, (sliderVal - 1) / 99.0);
        updateRate(rate);
      });
    }

    document.querySelectorAll('.btn-speed-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetRate = parseFloat(btn.dataset.rate);
        // Inverse mapping to slider val
        const sliderVal = 1.0 + 99.0 * (Math.log(targetRate) / Math.log(3600));
        if (speedSlider) speedSlider.value = sliderVal;
        updateRate(targetRate);
      });
    });
    // 9. log10(P) Mode Toggle Button
    const btnToggleLogP = document.getElementById('btn-toggle-logp');
    if (btnToggleLogP) {
      btnToggleLogP.addEventListener('click', () => {
        this.isLogPMode = !this.isLogPMode;
        if (this.isLogPMode) {
          btnToggleLogP.classList.add('active');
        } else {
          btnToggleLogP.classList.remove('active');
        }
        this.updateMetricsUI();
      });
    }
  }

  bindSlider(sliderId, badgeId, onChange, formatFn = (val) => parseFloat(val).toFixed(2)) {
    const slider = document.getElementById(sliderId);
    const badge = document.getElementById(badgeId);

    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = e.target.value;
        if (badge) badge.textContent = formatFn(val);
        onChange(val);
        this.updateMetricsUI();
      });
    }
  }

  handleCanvasPaint(e) {
    const rect = this.render.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = this.physics.nx / rect.width;
    const scaleY = this.physics.ny / rect.height;

    const gridX = Math.floor(clickX * scaleX);
    const gridY = Math.floor(clickY * scaleY);

    this.physics.paintSolute(gridX, gridY, 5, this.activePaintTool);
  }

  syncSlidersFromPhysics() {
    const { order, fluidity, thicknessNm, partitionK, dBase, radiusNm, mwDa, soluteType, soluteShape, aspectRatio, tempC, hasChannel } = this.physics.params;

    const setVal = (id, badgeId, val, formatted) => {
      const slider = document.getElementById(id);
      const badge = document.getElementById(badgeId);
      if (slider) slider.value = val;
      if (badge) badge.textContent = formatted;
    };

    const p = aspectRatio || 1.0;
    const shape = soluteShape || 'sphere';
    const fShape = this.physics.getPerrinShapeFactor(shape, p);

    setVal('slider-radius', 'val-radius', radiusNm, `${radiusNm.toFixed(2)} nm`);
    setVal('slider-aspect', 'val-aspect', p, p <= 1.05 ? '1.0 (Sphere)' : `${p.toFixed(1)} (${shape === 'rod' ? 'Rod' : 'Disc'})`);
    setVal('slider-temp', 'val-temp', tempC || 37.0, `${(tempC || 37.0).toFixed(1)} \u00B0C (${((tempC || 37.0) + 273.15).toFixed(2)} K)`);
    setVal('slider-order', 'val-order', order, order.toFixed(2));
    setVal('slider-fluidity', 'val-fluidity', fluidity, fluidity.toFixed(2));
    setVal('slider-thickness', 'val-thickness', thicknessNm, `${thicknessNm.toFixed(1)} nm`);
    setVal('slider-partition', 'val-partition', partitionK, partitionK.toFixed(2));

    const selectSoluteType = document.getElementById('select-solute-type');
    if (selectSoluteType) selectSoluteType.value = soluteType;

    const selectSoluteShape = document.getElementById('select-solute-shape');
    if (selectSoluteShape) selectSoluteShape.value = shape;

    const shapeBadge = document.getElementById('val-shape-factor');
    if (shapeBadge) {
      const shapeName = shape === 'rod' ? 'Rod' : (shape === 'disc' ? 'Disc' : 'Sphere');
      shapeBadge.textContent = `${shapeName} (f = ${fShape.toFixed(2)})`;
    }

    const mwBadge = document.getElementById('val-solute-mw');
    if (mwBadge) mwBadge.textContent = `${mwDa} Da`;

    const chkChannel = document.getElementById('chk-channel');
    if (chkChannel) chkChannel.checked = hasChannel;
  }

  updateMetricsUI() {
    const metrics = this.physics.getCalculatedMetrics();
    
    const dMemEl = document.getElementById('metric-dmem');
    const pEl = document.getElementById('metric-p');
    const pTitleEl = document.getElementById('metric-p-title');
    const pUnitEl = document.getElementById('metric-p-unit');
    const lagEl = document.getElementById('metric-lag');
    const fluxEl = document.getElementById('metric-flux');

    if (dMemEl) dMemEl.textContent = metrics.dMem;
    
    if (pEl) {
      if (this.isLogPMode) {
        if (pTitleEl) pTitleEl.innerHTML = 'Log Permeability (<i>log<sub>10</sub>P</i> &plusmn; &sigma;)';
        pEl.textContent = metrics.logP_str;
        if (pUnitEl) pUnitEl.textContent = 'log10(cm/s)';
      } else {
        if (pTitleEl) pTitleEl.innerHTML = 'Permeability (<i>P</i> &plusmn; &sigma;)';
        pEl.textContent = metrics.P_str;
        if (pUnitEl) pUnitEl.textContent = 'cm/s';
      }
    }

    if (lagEl) lagEl.textContent = metrics.lagTime;
    if (fluxEl) fluxEl.textContent = metrics.steadyStateFlux;
  }
}
