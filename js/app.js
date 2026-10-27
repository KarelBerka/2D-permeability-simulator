/**
 * app.js - Main Application Orchestrator & Animation Loop
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize simulation components
  const physics = new PhysicsEngine(160, 50);
  const render = new RenderEngine('sim-canvas', physics);
  const charts = new ChartEngine(physics);
  const controls = new ControlsManager(physics, render, charts);
  const minisims = new MiniSimulators(physics, controls);

  let isRunning = true;
  let lastTime = performance.now();

  // DOM Elements for Play/Pause & Step
  const btnPlay = document.getElementById('btn-play');
  const btnStep = document.getElementById('btn-step');
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');
  const statusDot = document.getElementById('sim-status-dot');
  const statusText = document.getElementById('sim-status-text');
  const timeVal = document.getElementById('time-val');

  // Theme Toggle Elements
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIconSun = document.getElementById('theme-icon-sun');
  const themeIconMoon = document.getElementById('theme-icon-moon');
  const themeLabel = document.getElementById('theme-label');

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('permeability_theme', theme);
    if (theme === 'light') {
      if (themeIconSun) themeIconSun.classList.remove('hidden');
      if (themeIconMoon) themeIconMoon.classList.add('hidden');
      if (themeLabel) themeLabel.textContent = 'Light';
    } else {
      if (themeIconSun) themeIconSun.classList.add('hidden');
      if (themeIconMoon) themeIconMoon.classList.remove('hidden');
      if (themeLabel) themeLabel.textContent = 'Dark';
    }
    charts.update();
  }

  const savedTheme = localStorage.getItem('permeability_theme') || 'dark';
  setTheme(savedTheme);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(current === 'light' ? 'dark' : 'light');
    });
  }

  // Chamber Indicator Bar Synchronization
  const chamberIndicatorBar = document.getElementById('chamber-indicator-bar');
  const badgeThickness = document.getElementById('badge-membrane-thickness');
  const badgePore = document.getElementById('badge-pore-status');
  const badgeCake = document.getElementById('badge-cake-status');
  const membranePhaseDesc = document.getElementById('membrane-phase-desc');

  function updateChamberIndicator() {
    if (!chamberIndicatorBar) return;
    const { memStart, memEnd, nx, params, C_precip_A, C_precip_B, ny } = physics;

    // Dynamically align grid columns with actual membrane slab position
    const leftPct = (memStart / nx) * 100;
    const memPct = ((memEnd - memStart) / nx) * 100;
    const rightPct = 100 - leftPct - memPct;

    chamberIndicatorBar.style.gridTemplateColumns = `${leftPct.toFixed(2)}% ${memPct.toFixed(2)}% ${rightPct.toFixed(2)}%`;

    if (badgeThickness) {
      badgeThickness.textContent = `${params.thicknessNm.toFixed(1)} nm`;
    }

    if (badgePore) {
      if (params.hasChannel) badgePore.classList.remove('hidden');
      else badgePore.classList.add('hidden');
    }

    // Check Cake Layer (fouling crust)
    if (badgeCake) {
      if (params.regime === 'crystallization') {
        const cakeConc = physics.getSurfaceCakeConcentration('both');
        if (cakeConc > 0.04) badgeCake.classList.remove('hidden');
        else badgeCake.classList.add('hidden');
      } else {
        badgeCake.classList.add('hidden');
      }
    }

    if (minisims && typeof minisims.updateSynthesisUI === 'function') {
      minisims.updateSynthesisUI();
    }

    if (membranePhaseDesc) {
      membranePhaseDesc.textContent = `Hydrophobic Core (${params.lipidPreset.toUpperCase()}, S = ${params.order.toFixed(2)}, η = ${params.fluidity.toFixed(2)})`;
    }
  }

  function updatePlayState(play) {
    isRunning = play;
    if (isRunning) {
      iconPause.classList.remove('hidden');
      iconPlay.classList.add('hidden');
      statusDot.className = 'status-dot running';
      statusText.textContent = 'Simulating';
    } else {
      iconPause.classList.add('hidden');
      iconPlay.classList.remove('hidden');
      statusDot.className = 'status-dot paused';
      statusText.textContent = 'Paused';
    }
  }

  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      updatePlayState(!isRunning);
    });
  }

  if (btnStep) {
    btnStep.addEventListener('click', () => {
      updatePlayState(false);
      physics.step(2);
      charts.update();
      controls.updateMetricsUI();
      updateChamberIndicator();
    });
  }

  // Main animation frame loop
  let frameCounter = 0;
  function loop(currentTime) {
    try {
      if (isRunning) {
        physics.step(2);
        charts.update();
        frameCounter++;
        if (frameCounter % 6 === 0) {
          controls.updateMetricsUI();
          updateChamberIndicator();
        }
      }

      render.render();
      minisims.step();

      if (timeVal && Number.isFinite(physics.time)) {
        timeVal.textContent = physics.time.toFixed(2);
      }
    } catch (err) {
      console.error("Simulation loop frame error:", err);
    }

    requestAnimationFrame(loop);
  }

  // Initial triggers
  render.updateLegendGradient('thermal');
  updateChamberIndicator();
  requestAnimationFrame(loop);
});
