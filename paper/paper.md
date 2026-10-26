---
title: '2D-Permeability-Simulator: An Interactive Web-Based Simulator for Membrane Permeability, Dual-Solute Diffusion, and Crystallization Kinetics'
tags:
  - JavaScript
  - biophysics
  - membrane permeability
  - Fickian diffusion
  - chemical potential
  - crystallization kinetics
  - biopharmaceutics
  - physical chemistry education
authors:
  - name: Karel Berka
    orcid: 0000-0001-7004-9842
    affiliation: 1
affiliations:
  - name: Department of Physical Chemistry, Faculty of Science, Palacký University Olomouc, 17. listopadu 1192/12, 771 46 Olomouc, Czech Republic
    index: 1
date: 26 October 2026
bibliography: paper.bib
---

# Summary

Passive solute transport across biological lipid bilayer membranes is a foundational concept across biophysics, physical chemistry, and pharmaceutical sciences [@Overton1899; @Diamond1974]. In university education and research workflows, passive permeation is most frequently treated via Overton's one-dimensional solubility-diffusion equation:

$$P = \frac{K \cdot D_{\text{mem}}}{d}$$

where $P$ is the membrane permeability coefficient, $K$ is the lipid-water partition coefficient, $D_{\text{mem}}$ is the intra-membrane diffusion coefficient, and $d$ is membrane thickness [@Crank1975].

While analytically straightforward, this idealized 1D steady-state formulation fails to represent critical dynamic, multi-component, and concentration-dependent phenomena encountered in biological systems and modern pharmaceutical formulations. These non-ideal phenomena include spatial phase-boundary partition jumps, non-equilibrium chemical potential gradients, cross-solute steric crowding or co-transport, aqueous boundary layers, thermodynamic solubility ceilings ($C_{\text{sat}}$), and membrane surface fouling (*cake layer resistance* caused by crystallization).

`2D-Permeability-Simulator` is an open-source, client-side, zero-install web application developed in modular modern JavaScript (ES6) and HTML5 Canvas. It provides real-time numerical simulation and interactive 2D visualization of non-steady-state dual-solute diffusion across lipid membranes, directly coupling continuous chemical potential partial differential equations (PDEs) with Flory-Huggins cross-solute interaction parameters, Stokes-Einstein hydrodynamic drag with Perrin shape factors [@Perrin1936], and non-equilibrium crystallization-dissolution kinetics.

# Statement of Need

Investigating and teaching non-equilibrium transport across heterogeneous interfaces requires bridging continuum differential equations with microscopic structural features. However, available computational tools typically exhibit one of two major limitations:
1. **Computational Overhead & Accessibility Barriers:** Atomistic and coarse-grained molecular dynamics (MD) simulations [@Marrink1994; @Berka2016] provide atomic resolution of free-energy profiles $\Delta G(z)$ and local diffusivities $D(z)$, but require high-performance computing clusters, lengthy walltimes, and specialized software (e.g., GROMACS, NAMD), making them impractical for real-time classroom instruction or rapid hypothesis screening.
2. **Oversimplified 1D Calculators:** Spreadsheet calculators and 1D compartmental pharmacokinetic tools are either static, proprietary closed-source solutions [@Amidon1995], or ignore 2D spatial heterogeneity, such as localized aqueous pore channels, membrane defects, or localized crystal cake deposition on the bilayer surface.

`2D-Permeability-Simulator` bridges this critical gap by providing an instant-access, real-time, interactive computational workbench that runs natively in any modern web browser without dependencies, software compilation, or server-side computation.

# Core Mathematical & Computational Architecture

### 1. Coupled Chemical Potential Diffusion PDEs
To prevent numerical gradient singularities and artificial mass accumulation at the sharp lipid-water interface ($x = x_{\text{memStart}}$ and $x = x_{\text{memEnd}}$), mass transport is solved in terms of continuous chemical potential $u(x, y, t)$ [@Fick1855]:

$$\frac{\partial C_{\text{free}}(x, y, t)}{\partial t} = \nabla \cdot \left( \hat{D}(x, y) \, \nabla u(x, y, t) \right)$$

where $u(x, y, t) = C_{\text{free}}(x, y, t)$ in aqueous chambers, and $u(x, y, t) = C_{\text{free}}(x, y, t) / K$ inside the hydrophobic membrane core. At thermodynamic equilibrium across the interface, $u$ is continuous, naturally satisfying Overton's boundary partition jump:

$$C_{\text{membrane}} = K \cdot C_{\text{water}}$$

Spatial integration is computed on a 2D staggered grid using a 2-way Gauss-Seidel relaxation solver with harmonic interface diffusivities, ensuring numerical stability and mass conservation across closed boundary walls.

### 2. Hydrodynamic Friction, Perrin Shape Factors, and Arrhenius Scaling
Aqueous solute diffusivity is modeled via the Stokes-Einstein relation, parameterized by molecular weight ($MW$), hydration shell thickness, and Perrin ellipsoid shape factors $f_{\text{shape}}$ [@Perrin1936]:

$$R_{\text{eq}} = 0.066 \cdot (MW)^{1/3} \quad [\text{nm}], \qquad r_h = R_{\text{eq}} \cdot f_{\text{shape}} \cdot (1 + 0.18 \cdot \text{Hydration})$$

where $f_{\text{shape}} = 1.0$ for spheres, $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{1/3} \ln\left(p + \sqrt{p^2 - 1}\right)}$ for prolate rods ($p = a/b > 1$), and $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \arctan\left(\sqrt{p^2 - 1}\right)}$ for oblate discs ($p = a/b > 1$). Temperature dependence ($T$) is governed by Arrhenius thermal activation relative to $T_0 = 298.15\text{ K}$:

$$D_{\text{wat}}(T) = D_0 \cdot \exp\left(-\frac{E_a}{R T} + \frac{E_a}{R T_0}\right)$$

### 3. Concentration Dependence, Crystallization, and Cake Fouling
Users can toggle between ideal *💧 Infinite Dilution* ($C_{\text{sat}} \to \infty$) and realistic *💎 Crystallization* modes. In the crystallization regime, whenever local concentration exceeds the aqueous solubility limit ($C_{\text{free}} > C_{\text{sat}}$), excess solute reversibly nucleates into solid crystalline precipitates $C_{\text{precip}}$:

$$\frac{\partial C_{\text{precip}}}{\partial t} = k_{\text{cryst}} \cdot \max\left(0, \frac{C_{\text{free}} - C_{\text{sat}}}{C_{\text{sat}}}\right) - k_{\text{dissol}} \cdot C_{\text{precip}}$$

Only dissolved free monomers drive thermodynamic chemical potential $u$. Precipitates depositing at the donor-membrane boundary form a surface cake layer that impairs membrane diffusivity:

$$D_{\text{eff}}(x, y) = \frac{D_{\text{base}}(x, y)}{1 + r_{\text{cake}} \cdot C_{\text{precip}}}$$

# Key Features & Educational Minisimulators

- **Dual-Solute Visualization**: Simultaneous tracking of Solute A (Blue) and Solute B (Red) with independent parameters and Flory-Huggins cross-solute interaction parameter ($\chi_{AB}$).
- **Macro, Micro, and Dual Viewports**: Real-time 2D scalar heatmaps with dynamic marching isolines, procedurally animated lipid bilayers reflecting order parameter $S$ and fluidity $\eta$, and animated micro-crystal graphics.
- **Dynamic 1D & Time-Series Analytics**: Live cross-sectional 1D concentration profile $C(x)$ with shaded solid precipitate fractions, dashed $C_{\text{sat}}$ threshold lines, and receiver accumulation kinetics $J(t)$.
- **Educational Minisimulators**: Two dedicated didactic modules for isolating individual transport determinants:
  1. *Partition Coefficient ($K / \log P$) Minisimulator*: Displays a microscopic two-phase water/membrane chamber where particles cross an interface according to Boltzmann transition probabilities, allowing students to observe how thermodynamic equilibrium $N_{\text{lipid}} / N_{\text{water}} = K$ emerges dynamically.
  2. *Diffusion Coefficient ($D$) Minisimulator*: Visualizes 2D Brownian random walks, Stokes-Einstein viscosity effects ($\eta_{\text{water}}$ vs. $\eta_{\text{oil}}$ vs. $\eta_{\text{lipid}}$), and mean squared displacement $\langle r^2 \rangle = 4Dt$ via drop-pulse experiments.
  3. *Overton Synthesis Panel*: Direct one-click application of experimental $K$ and $D$ values to the main 2D simulation engine.
- **Automated Testing**: Headless unit and regression test suite (`tests/physics.test.js`) executed via Node.js verifying mass conservation, partition jumps, and hydrodynamics.

# Acknowledgements

The development of this software was supported by Palacký University Olomouc.

# References
