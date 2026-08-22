/**
 * controls.js - Dynamic UI Control Manager for Dual-Solute 2D Permeability Simulator
 * Wire up Solute A (Blue), Solute B (Red), Interaction Sliders, View Modes, and Comparative Metrics.
 */

class ControlsManager {
  constructor(physics, render, charts) {
    this.physics = physics;
    this.render = render;
    this.charts = charts;

    this.isMouseDown = false;
    this.activePaintTool = 'source'; // 'source', 'sink', 'erase'

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

    // Solute View Mode Toggle (Both, Solute A, Solute B)
    const btnViewBoth = document.getElementById('btn-view-both');
    const btnViewA = document.getElementById('btn-view-soluteA');
    const btnViewB = document.getElementById('btn-view-soluteB');

    const setSoluteView = (viewMode) => {
      this.physics.viewSolute = viewMode;
      [btnViewBoth, btnViewA, btnViewB].forEach(btn => btn && btn.classList.remove('active'));
      if (viewMode === 'A' && btnViewA) btnViewA.classList.add('active');
      else if (viewMode === 'B' && btnViewB) btnViewB.classList.add('active');
      else if (btnViewBoth) btnViewBoth.classList.add('active');
    };

    if (btnViewBoth) btnViewBoth.addEventListener('click', () => setSoluteView('both'));
    if (btnViewA) btnViewA.addEventListener('click', () => setSoluteView('A'));
    if (btnViewB) btnViewB.addEventListener('click', () => setSoluteView('B'));

    // Solute Parameter Tabs (Solute A, Solute B, Interactions)
    const tabA = document.getElementById('tab-soluteA');
    const tabB = document.getElementById('tab-soluteB');
    const tabInteract = document.getElementById('tab-interact');

    const panelA = document.getElementById('panel-soluteA');
    const panelB = document.getElementById('panel-soluteB');
    const panelInteract = document.getElementById('panel-interact');

    const switchSoluteTab = (targetTab) => {
      [tabA, tabB, tabInteract].forEach(t => t && t.classList.remove('active'));
      [panelA, panelB, panelInteract].forEach(p => p && p.classList.add('hidden'));

      if (targetTab === 'soluteA') {
        if (tabA) tabA.classList.add('active');
        if (panelA) panelA.classList.remove('hidden');
      } else if (targetTab === 'soluteB') {
        if (tabB) tabB.classList.add('active');
        if (panelB) panelB.classList.remove('hidden');
      } else if (targetTab === 'interact') {
        if (tabInteract) tabInteract.classList.add('active');
        if (panelInteract) panelInteract.classList.remove('hidden');
      }
    };

    if (tabA) tabA.addEventListener('click', () => switchSoluteTab('soluteA'));
    if (tabB) tabB.addEventListener('click', () => switchSoluteTab('soluteB'));
    if (tabInteract) tabInteract.addEventListener('click', () => switchSoluteTab('interact'));

    // Preset Solute Selection for Solute A and Solute B
    const solutePresets = {
      ibuprofen:    { name: 'Ibuprofen', mw: 206, radius: 0.45, partitionK: 3.05, hydration: 0.20, affinity: 0.85 },
      caffeine:     { name: 'Caffeine', mw: 194, radius: 0.38, partitionK: 0.15, hydration: 0.65, affinity: 0.15 },
      water:        { name: 'Water', mw: 18, radius: 0.15, partitionK: 0.20, hydration: 0.90, affinity: 0.05 },
      ion:          { name: 'Ion Na⁺/Cl⁻', mw: 30, radius: 0.25, partitionK: 0.05, hydration: 0.95, affinity: 0.01 },
      small_organic:{ name: 'Small Organic', mw: 100, radius: 0.40, partitionK: 0.80, hydration: 0.40, affinity: 0.40 },
      macrocycle:   { name: 'Macrocycle', mw: 1000, radius: 1.20, partitionK: 2.20, hydration: 0.30, affinity: 0.70 },
      biopolymer:   { name: 'Biopolymer', mw: 3000, radius: 2.00, partitionK: 0.10, hydration: 0.80, affinity: 0.10 }
    };

    const applySolutePreset = (soluteKey, presetObj) => {
      const spec = (soluteKey === 'A') ? this.physics.params.soluteA : this.physics.params.soluteB;
      spec.name = presetObj.name;
      spec.mwDa = presetObj.mw;
      spec.radiusNm = presetObj.radius;
      spec.partitionK = presetObj.partitionK;
      spec.hydration = presetObj.hydration;
      spec.membraneAffinity = presetObj.affinity;

      this.physics.rebuildDiffusionMap();
      this.syncSlidersFromPhysics();
      this.updateMetricsUI();
    };

    const selA = document.getElementById('select-soluteA-type');
    if (selA) {
      selA.addEventListener('change', (e) => {
        const p = solutePresets[e.target.value] || solutePresets.ibuprofen;
        applySolutePreset('A', p);
      });
    }

    const selB = document.getElementById('select-soluteB-type');
    if (selB) {
      selB.addEventListener('change', (e) => {
        const p = solutePresets[e.target.value] || solutePresets.caffeine;
        applySolutePreset('B', p);
      });
    }

    // Bind Solute A Sliders
    this.bindSlider('slider-soluteA-partition', 'val-soluteA-partition', (v) => {
      this.physics.params.soluteA.partitionK = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-soluteA-conc', 'val-soluteA-conc', (v) => {
      this.physics.params.soluteA.initialConc = parseFloat(v);
      this.physics.resetScenario();
    }, (v) => `${parseFloat(v).toFixed(1)} mM`);

    this.bindSlider('slider-soluteA-radius', 'val-soluteA-radius', (v) => {
      this.physics.params.soluteA.radiusNm = parseFloat(v);
      this.physics.params.soluteA.manualRadiusOverride = true;
      this.physics.rebuildDiffusionMap();
    }, (v) => `${parseFloat(v).toFixed(2)} nm`);

    this.bindSlider('slider-soluteA-hydration', 'val-soluteA-hydration', (v) => {
      this.physics.params.soluteA.hydration = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-soluteA-affinity', 'val-soluteA-affinity', (v) => {
      this.physics.params.soluteA.membraneAffinity = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    // Bind Solute B Sliders
    this.bindSlider('slider-soluteB-partition', 'val-soluteB-partition', (v) => {
      this.physics.params.soluteB.partitionK = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-soluteB-conc', 'val-soluteB-conc', (v) => {
      this.physics.params.soluteB.initialConc = parseFloat(v);
      this.physics.resetScenario();
    }, (v) => `${parseFloat(v).toFixed(1)} mM`);

    this.bindSlider('slider-soluteB-radius', 'val-soluteB-radius', (v) => {
      this.physics.params.soluteB.radiusNm = parseFloat(v);
      this.physics.params.soluteB.manualRadiusOverride = true;
      this.physics.rebuildDiffusionMap();
    }, (v) => `${parseFloat(v).toFixed(2)} nm`);

    this.bindSlider('slider-soluteB-hydration', 'val-soluteB-hydration', (v) => {
      this.physics.params.soluteB.hydration = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    this.bindSlider('slider-soluteB-affinity', 'val-soluteB-affinity', (v) => {
      this.physics.params.soluteB.membraneAffinity = parseFloat(v);
      this.physics.rebuildDiffusionMap();
    });

    // Cross-Solute Interaction Slider
    this.bindSlider('slider-interact-AB', 'val-interact-AB', (v) => {
      const val = parseFloat(v);
      this.physics.params.interactAB = val;
    }, (v) => {
      const val = parseFloat(v);
      if (val < -0.05) return `${val.toFixed(2)} (Attraction)`;
      if (val > 0.05) return `${val.toFixed(2)} (Crowding)`;
      return `0.00 (Independent)`;
    });

    // Temperature Control Slider
    this.bindSlider('slider-temp', 'val-temp', (val) => {
      this.physics.params.tempC = parseFloat(val);
      this.physics.rebuildDiffusionMap();
    }, (val) => `${parseFloat(val).toFixed(1)} \u00B0C`);

    // Membrane Sliders
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

    // Channel Pore Checkbox
    const chkChannel = document.getElementById('chk-channel');
    if (chkChannel) {
      chkChannel.addEventListener('change', (e) => {
        this.physics.params.hasChannel = e.target.checked;
        this.physics.rebuildDiffusionMap();
        this.updateMetricsUI();
      });
    }

    // View Mode Toggles (Macro / Micro / Dual Solutes)
    const btnMacro = document.getElementById('mode-macro');
    const btnMicro = document.getElementById('mode-micro');
    const btnDual = document.getElementById('mode-dual');

    const updateViewModeButtons = (activeMode) => {
      [btnMacro, btnMicro, btnDual].forEach(b => b && b.classList.remove('active'));
      if (activeMode === 'macro' && btnMacro) btnMacro.classList.add('active');
      else if (activeMode === 'micro' && btnMicro) btnMicro.classList.add('active');
      else if (activeMode === 'dual' && btnDual) btnDual.classList.add('active');
    };

    if (btnMacro) {
      btnMacro.addEventListener('click', () => {
        updateViewModeButtons('macro');
        this.render.viewMode = 'macro';
        this.physics.viewSolute = 'A';
        setSoluteView('A');
      });
    }

    if (btnMicro) {
      btnMicro.addEventListener('click', () => {
        updateViewModeButtons('micro');
        this.render.viewMode = 'micro';
      });
    }

    if (btnDual) {
      btnDual.addEventListener('click', () => {
        updateViewModeButtons('dual');
        this.render.viewMode = 'macro';
        this.physics.viewSolute = 'both';
        setSoluteView('both');
      });
    }

    // Paint Tool Selection
    const toolButtons = document.querySelectorAll('.btn-tool');
    toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toolButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activePaintTool = btn.dataset.tool;
      });
    });

    // Canvas Painting Interaction
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

    // Rate Controls
    const speedSlider = document.getElementById('sim-speed');
    const speedValDisplay = document.getElementById('speed-val');

    const updateRate = (rateSecPerSec) => {
      this.physics.params.speedMultiplier = rateSecPerSec;
      let displayStr = `${rateSecPerSec.toFixed(0)}s/s`;
      if (rateSecPerSec >= 3600) displayStr = `${(rateSecPerSec / 3600).toFixed(1)}h/s`;
      else if (rateSecPerSec >= 60) displayStr = `${(rateSecPerSec / 60).toFixed(1)}m/s`;

      if (speedValDisplay) speedValDisplay.textContent = displayStr;

      document.querySelectorAll('.btn-speed-preset').forEach((btn) => {
        const btnRate = parseFloat(btn.dataset.rate);
        if (Math.abs(btnRate - rateSecPerSec) < 0.5) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    };

    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const sliderVal = parseFloat(e.target.value);
        const rate = Math.pow(3600, (sliderVal - 1) / 99.0);
        updateRate(rate);
      });
    }

    document.querySelectorAll('.btn-speed-preset').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetRate = parseFloat(btn.dataset.rate);
        const sliderVal = 1.0 + 99.0 * (Math.log(targetRate) / Math.log(3600));
        if (speedSlider) speedSlider.value = sliderVal;
        updateRate(targetRate);
      });
    });

    // Toggles
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

    // 1D Profile Scale Toggle (Auto-Fit vs Log10)
    const btnToggleScale = document.getElementById('btn-toggle-profile-scale');
    const labelToggleScale = document.getElementById('profile-scale-label');
    if (btnToggleScale) {
      btnToggleScale.addEventListener('click', () => {
        if (this.charts.profileScaleMode === 'auto') {
          this.charts.profileScaleMode = 'log';
          btnToggleScale.classList.add('active');
          if (labelToggleScale) labelToggleScale.textContent = 'Log10 Scale';
        } else {
          this.charts.profileScaleMode = 'auto';
          btnToggleScale.classList.remove('active');
          if (labelToggleScale) labelToggleScale.textContent = 'Auto-Fit Y';
        }
      });
    }

    this.syncSlidersFromPhysics();
    this.updateMetricsUI();
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

    const soluteTarget = (this.physics.viewSolute === 'B') ? 'B' : 'A';
    this.physics.paintSolute(gridX, gridY, 5, this.activePaintTool, soluteTarget);
  }

  syncSlidersFromPhysics() {
    const p = this.physics.params;
    const sA = p.soluteA;
    const sB = p.soluteB;

    const setVal = (id, badgeId, val, formatted) => {
      const slider = document.getElementById(id);
      const badge = document.getElementById(badgeId);
      if (slider) slider.value = val;
      if (badge) badge.textContent = formatted;
    };

    // Solute A sliders
    setVal('slider-soluteA-partition', 'val-soluteA-partition', sA.partitionK, sA.partitionK.toFixed(2));
    setVal('slider-soluteA-conc', 'val-soluteA-conc', sA.initialConc, `${sA.initialConc.toFixed(1)} mM`);
    setVal('slider-soluteA-radius', 'val-soluteA-radius', sA.radiusNm, `${sA.radiusNm.toFixed(2)} nm`);
    setVal('slider-soluteA-hydration', 'val-soluteA-hydration', sA.hydration || 0, (sA.hydration || 0).toFixed(2));
    setVal('slider-soluteA-affinity', 'val-soluteA-affinity', sA.membraneAffinity || 0.5, (sA.membraneAffinity || 0.5).toFixed(2));

    // Solute B sliders
    setVal('slider-soluteB-partition', 'val-soluteB-partition', sB.partitionK, sB.partitionK.toFixed(2));
    setVal('slider-soluteB-conc', 'val-soluteB-conc', sB.initialConc, `${sB.initialConc.toFixed(1)} mM`);
    setVal('slider-soluteB-radius', 'val-soluteB-radius', sB.radiusNm, `${sB.radiusNm.toFixed(2)} nm`);
    setVal('slider-soluteB-hydration', 'val-soluteB-hydration', sB.hydration || 0, (sB.hydration || 0).toFixed(2));
    setVal('slider-soluteB-affinity', 'val-soluteB-affinity', sB.membraneAffinity || 0.5, (sB.membraneAffinity || 0.5).toFixed(2));

    // Interaction slider
    setVal('slider-interact-AB', 'val-interact-AB', p.interactAB || 0, (p.interactAB || 0).toFixed(2));

    // Membrane sliders
    setVal('slider-temp', 'val-temp', p.tempC || 37.0, `${(p.tempC || 37.0).toFixed(1)} \u00B0C`);
    setVal('slider-order', 'val-order', p.order, p.order.toFixed(2));
    setVal('slider-fluidity', 'val-fluidity', p.fluidity, p.fluidity.toFixed(2));
    setVal('slider-thickness', 'val-thickness', p.thicknessNm, `${p.thicknessNm.toFixed(1)} nm`);

    const chkChannel = document.getElementById('chk-channel');
    if (chkChannel) chkChannel.checked = p.hasChannel;
  }

  updateMetricsUI() {
    const metrics = this.physics.getCalculatedMetrics();

    const setElemText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setElemText('val-metrics-temp', metrics.tempC);
    setElemText('val-metrics-chi', metrics.interactAB);

    // Solute A metrics
    setElemText('m-dwat-A', `${metrics.soluteA.dWaterCm2s} cm²/s`);
    setElemText('m-dmem-A', `${metrics.soluteA.dMemCm2s} cm²/s`);
    setElemText('m-P-A', `${metrics.soluteA.P_str} cm/s`);
    setElemText('m-logP-A', metrics.soluteA.logP_str);
    setElemText('m-lag-A', metrics.soluteA.lagTimePhys);

    // Solute B metrics
    setElemText('m-dwat-B', `${metrics.soluteB.dWaterCm2s} cm²/s`);
    setElemText('m-dmem-B', `${metrics.soluteB.dMemCm2s} cm²/s`);
    setElemText('m-P-B', `${metrics.soluteB.P_str} cm/s`);
    setElemText('m-logP-B', metrics.soluteB.logP_str);
    setElemText('m-lag-B', metrics.soluteB.lagTimePhys);
  }
}
