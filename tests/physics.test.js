/**
 * tests/physics.test.js
 * Automated headless test suite for 2D Membrane Permeability Simulator
 * Verifies mass conservation, thermodynamic partition jumps, Stokes-Einstein hydrodynamics,
 * Perrin shape factors, Arrhenius scaling, and crystallization kinetics.
 *
 * Run with: node tests/physics.test.js
 */

const PhysicsEngine = require('../js/physics.js');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

function runTests() {
  console.log('=====================================================');
  console.log('2D Membrane Permeability Simulator: Automated Test Suite');
  console.log('=====================================================\n');

  // Test 1: Initialization and Geometry
  console.log('1. Grid Initialization & Geometry:');
  const engine = new PhysicsEngine(160, 50);
  assert(engine.nx === 160 && engine.ny === 50, 'Grid dimensions initialized correctly');
  assert(engine.memStart > 0 && engine.memEnd > engine.memStart, 'Membrane slab positioned with valid boundaries', `memStart: ${engine.memStart}, memEnd: ${engine.memEnd}`);

  // Test 2: Stokes-Einstein and Hydrodynamic Radius
  console.log('\n2. Molecular Hydrodynamics & Perrin Shape Factors:');
  const sphereSpec = { mwDa: 206, soluteShape: 'sphere', aspectRatio: 1.0, hydration: 0.0 };
  const discSpec = { mwDa: 206, soluteShape: 'disc', aspectRatio: 2.4, hydration: 0.0 };
  const rodSpec = { mwDa: 206, soluteShape: 'rod', aspectRatio: 3.0, hydration: 0.0 };

  const rSphere = engine.computeHydrodynamicRadius(sphereSpec);
  const rDisc = engine.computeHydrodynamicRadius(discSpec);
  const rRod = engine.computeHydrodynamicRadius(rodSpec);

  assert(rSphere > 0.35 && rSphere < 0.45, 'Spherical equivalent radius matches empirical expectation', `r: ${rSphere.toFixed(3)} nm`);
  assert(rDisc > rSphere, 'Disc shape exhibits higher hydrodynamic friction than sphere of identical MW', `rDisc: ${rDisc.toFixed(3)} nm vs rSphere: ${rSphere.toFixed(3)} nm`);
  assert(rRod > rSphere, 'Rod shape exhibits higher hydrodynamic friction than sphere of identical MW', `rRod: ${rRod.toFixed(3)} nm vs rSphere: ${rSphere.toFixed(3)} nm`);

  // Test 3: Arrhenius Temperature Scaling
  console.log('\n3. Arrhenius Temperature Scaling:');
  engine.params.tempC = 25.0;
  const factor25 = engine.getTemperatureFactor();
  engine.params.tempC = 37.0;
  const factor37 = engine.getTemperatureFactor();
  engine.params.tempC = 45.0;
  const factor45 = engine.getTemperatureFactor();

  assert(Math.abs(factor25 - 1.0) < 1e-4, 'Temperature factor is exactly 1.0 at reference 25°C (298.15 K)');
  assert(factor37 > factor25, 'Diffusivity accelerates at physiological body temperature 37°C', `Factor: ${factor37.toFixed(3)}`);
  assert(factor45 > factor37, 'Diffusivity continues monotonic acceleration with increasing temperature', `Factor 45°C: ${factor45.toFixed(3)}`);

  // Test 4: Mass / Chemical Potential Conservation in Closed 2D Domain
  console.log('\n4. Chemical Potential Conservation in Closed Domain:');
  const sim = new PhysicsEngine(60, 20);
  sim.params.regime = 'infinite_dilution';
  sim.resetScenario('default');

  let initialU_A = 0;
  for (let i = 0; i < sim.nx * sim.ny; i++) {
    initialU_A += sim.u_A[i];
  }

  // Step simulation forward 20 iterations
  for (let step = 0; step < 20; step++) {
    sim.step(1);
  }

  let finalU_A = 0;
  for (let i = 0; i < sim.nx * sim.ny; i++) {
    finalU_A += sim.u_A[i];
  }

  const uDeltaPercent = Math.abs(finalU_A - initialU_A) / Math.max(1e-6, initialU_A) * 100;
  assert(uDeltaPercent < 0.1, 'Chemical potential u is conserved in closed domain (< 0.1% divergence)', `Delta: ${uDeltaPercent.toFixed(4)}%`);

  // Test 5: Partition Jump Condition & Chemical Potential
  console.log('\n5. Partition Jump Condition & Chemical Potential:');
  const K_A = sim.params.soluteA.partitionK;
  assert(K_A === 3.05, 'Partition coefficient K_A matches preset value');

  const donorIdx = 5 * sim.nx + 5;
  assert(sim.u_A[donorIdx] === sim.C_A[donorIdx], 'Chemical potential equals concentration in aqueous donor reservoir');

  // Test 6: Crystallization and Cake Layer Fouling
  console.log('\n6. Crystallization & Membrane Surface Fouling:');
  const crystSim = new PhysicsEngine(80, 30);
  crystSim.params.regime = 'crystallization';
  crystSim.params.soluteA.initialConc = 3.0; // Supersaturated (C0 = 3.0 mM, C_sat = 1.2 mM)
  crystSim.params.soluteA.solubilityLimit = 1.2;
  crystSim.params.soluteA.crystRate = 0.5;
  crystSim.resetScenario('default');

  // Verify precipitate generation under supersaturation
  for (let s = 0; s < 30; s++) {
    crystSim.step(1);
  }

  let totalPrecipA = 0;
  for (let i = 0; i < crystSim.nx * crystSim.ny; i++) {
    totalPrecipA += crystSim.C_precip_A[i];
  }
  assert(totalPrecipA > 0, 'Supersaturated solute precipitates into crystalline solid fraction', `Total Precip: ${totalPrecipA.toFixed(2)} mM`);

  const metrics = crystSim.getCalculatedMetrics();
  assert(metrics.soluteA.P_val > 0, 'Effective permeability is computed with cake resistance', `P_val: ${metrics.soluteA.P_val.toExponential(3)} cm/s`);
  assert(typeof metrics.soluteA.lagTimePhys === 'string' && metrics.soluteA.lagTimePhys.length > 0, 'Lag time is computed and formatted accurately', `tau: ${metrics.soluteA.lagTimePhys}`);

  console.log('\n=====================================================');
  console.log(`Test Results: ${passedTests}/${totalTests} Passed (${Math.round(passedTests / totalTests * 100)}%)`);
  console.log('=====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
