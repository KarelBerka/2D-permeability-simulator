/**
 * app.js - Main Application Orchestrator & Animation Loop
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize simulation components
  const physics = new PhysicsEngine(160, 50);
  const render = new RenderEngine('sim-canvas', physics);
  const charts = new ChartEngine(physics);
  const controls = new ControlsManager(physics, render, charts);

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
    });
  }

  // Main animation frame loop
  function loop(currentTime) {
    try {
      if (isRunning) {
        physics.step(2);
        charts.update();
        controls.updateMetricsUI();
      }

      render.render();

      if (timeVal && Number.isFinite(physics.time)) {
        timeVal.textContent = physics.time.toFixed(2);
      }
    } catch (err) {
      console.error("Simulation loop frame error:", err);
    }

    requestAnimationFrame(loop);
  }

  // Initial trigger
  render.updateLegendGradient('thermal');
  requestAnimationFrame(loop);
});
