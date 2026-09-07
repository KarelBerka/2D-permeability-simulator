---
title: '2D-Permeability-Simulator: An Interactive Web-Based Computational Framework for Multi-Solute Non-Equilibrium Membrane Transport, Cross-Interactions, and Crystallization Kinetics'
tags:
  - JavaScript
  - biophysics
  - membrane permeability
  - Fickian diffusion
  - chemical potential
  - crystallization kinetics
  - physical chemistry education
authors:
  - name: Karel Berka
    orcid: 0000-0001-7004-9842
    affiliation: 1
affiliations:
  - name: Department of Physical Chemistry, Faculty of Science, Palacký University Olomouc, 17. listopadu 1192/12, 771 46 Olomouc, Czech Republic
    index: 1
date: 07 September 2026
bibliography: paper.bib
---

# Summary

Passive transport across biological membranes is an essential topic in computational biophysics, pharmacology, and chemical education. In standard models, passive permeation is often introduced via Overton's one-dimensional solubility-diffusion equation:
$$P = \frac{K \cdot D_{\text{mem}}}{d}$$
where $K$ is the lipid-water partition coefficient, $D_{\text{mem}}$ is the intra-membrane diffusion coefficient, and $d$ is the membrane thickness.

While analytically tractable, this formulation fails to capture critical dynamic, multi-component, and concentration-dependent phenomena encountered in real-world formulations and biological transport—such as non-equilibrium chemical potential gradients, cross-solute steric crowding, thermodynamic solubility limits ($C_{\text{sat}}$), and membrane surface fouling (*cake layer resistance*).

`2D-Permeability-Simulator` is a high-performance, client-side, open-source web application designed for interactive numerical modeling and real-time visualization of 2D non-steady-state dual-solute diffusion across lipid bilayers. The software runs in any modern browser without installation or backend dependencies.

# Statement of Need

Understanding non-equilibrium mass transport requires bridging continuum partial differential equations (PDEs) with microscopic structural details. However, available simulation software typically either requires specialized Python/C++ environments or lacks interactive real-time multi-solute parameter manipulation.

`2D-Permeability-Simulator` addresses this need by providing:
1. **Coupled Chemical Potential Diffusion PDEs:** Solves mass transport across heterogeneous phase boundaries using continuous chemical potential $u(x,y,t)$ to eliminate artificial boundary discontinuities.
2. **Dual-Solute Cross-Coupling:** Incorporates Flory-Huggins interaction parameters ($\chi_{AB}$) to simulate steric crowding and co-transport in multi-solute mixtures.
3. **Concentration Dependence & Crystallization Kinetics:** Implements reversible precipitation-dissolution kinetics and dynamic membrane surface fouling (*cake layer resistance* $r_{\text{cake}}$), allowing users to switch between ideal *Infinite Dilution* and *Crystallization* regimes.
4. **Dual Visual & Analytical Modes:** Features real-time composite RGB heatmaps, animated lipid head/tail structures, dynamic 1D concentration profiles $C(x)$ with phase separation, and receiver accumulation curves $J(t)$.

# Mathematics & Architecture

The simulator is implemented in modular ES6 JavaScript with HTML5 Canvas/WebGL rendering. Spatial domain integration uses an unconditionally stable 2-way Gauss-Seidel relaxation solver with harmonic interface diffusivities, ensuring strict mass conservation across container walls. Solute hydrodynamic radii are computed using Perrin ellipsoid friction factors ($f_{\text{shape}}$) for spherical, rod, and disc geometries, scaled by Arrhenius thermal activation ($E_a/R \approx 2180\text{ K}$).

# Acknowledgements

This work was supported by Palacký University Olomouc.
