# 2D Membrane Permeability & Diffusion Simulator

An interactive, high-performance web application for visualizing and simulating 2D non-steady-state solute diffusion and passive permeation across lipid bilayer membranes.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00F2FE?style=for-the-badge&logo=github)](https://karelberka.github.io/2D-permeability-simulator/)
[![License](https://img.shields.io/badge/License-MIT-00F5D4?style=for-the-badge)](LICENSE)

---

## 🔬 Overview & Theoretical Principles

The **2D Membrane Permeability & Diffusion Simulator** provides a visual and quantitative environment to study small molecule and biomolecular transport across biological membranes.

The core physics engine solves the 2D Fickian non-steady-state diffusion Partial Differential Equation (PDE) with thermodynamic partition boundary jump conditions:

$$\frac{\partial C(x,y,t)}{\partial t} = \nabla \cdot \left( \hat{D}(x,y) \, \nabla u(x,y,t) \right)$$

where:
- $u(x,y,t)$ is the continuous chemical potential variable enforcing thermodynamic equilibrium across domain boundaries.
- $C(x,y,t)$ is the actual solute concentration, related to potential $u$ inside the hydrophobic membrane core by the **Partition Coefficient ($K$)**:
  $$C_{\text{membrane}} = K \cdot C_{\text{water}}$$

---

## 🚀 Key Features & Highlights

### 1. Solubility-Diffusion Model & Overton's Rule
Calculates real-time macroscopic permeability $P$, effective membrane diffusion $D_{\text{mem}}$, and steady-state flux $J_{\text{ss}}$:
$$P = \frac{K \cdot D_{\text{mem}}}{d}$$
where $d$ is the membrane slab thickness ($2.0 - 10.0 \text{ nm}$).

### 2. Stokes-Einstein Hydrodynamic Scaling
Solute diffusion in water scales inversely with hydrodynamic radius ($r_h$):
$$D_{\text{water}}(T) = \frac{k_B T}{6 \pi \eta r_h}$$
Includes built-in presets for:
- **Water Molecule**: $18 \text{ Da}, \, r_h = 0.15 \text{ nm}$
- **Monovalent Ion ($\text{Na}^+/\text{Cl}^-$)**: $30 \text{ Da}, \, r_h = 0.25 \text{ nm}$
- **Small Organic / Sugar**: $100 \text{ Da}, \, r_h = 0.40 \text{ nm}$
- **Small Drug Molecule**: $300 \text{ Da}, \, r_h = 0.70 \text{ nm}$
- **Macrocycle / Cyclic Peptide**: $1000 \text{ Da}, \, r_h = 1.20 \text{ nm}$
- **Biopolymer / Oligo**: $3000 \text{ Da}, \, r_h = 2.00 \text{ nm}$

### 3. Temperature Control ($4^\circ\text{C} \to 50^\circ\text{C}$) & Body Temperature ($37^\circ\text{C}$)
Arrhenius activation energy temperature dependence ($E_a \approx 18.2 \text{ kJ/mol}$) for water self-diffusion:
- At **$25^\circ\text{C}$ (Room Temp)**: $D_{\text{water}} = 2.30 \times 10^{-5} \text{ cm}^2/\text{s} = 2.30 \times 10^{-9} \text{ m}^2/\text{s}$
- At **$37^\circ\text{C}$ (Human Body Temp 🩸)**: $D_{\text{water}} = 3.00 \times 10^{-5} \text{ cm}^2/\text{s} = 3.00 \times 10^{-9} \text{ m}^2/\text{s}$

### 4. Thermodynamic Langevin Particle Dynamics
Brownian particle cloud with interface reflection and trapping probabilities ($P_{\text{entry}} = \min(1.0, K)$, $P_{\text{exit}} = \min(1.0, 1/K)$), guaranteeing exact 1-to-1 matching between particle density and 2D concentration heatmaps.

### 5. Logarithmic $\log_{10}P$ Toggle & Uncertainty Bounds ($\pm \sigma$)
Displays permeability metrics in linear ($P \text{ cm/s}$) or logarithmic ($\log_{10}P$) modes with thermal lipid fluctuation uncertainty bounds:
$$\sigma_P = P \cdot \sqrt{\left(\frac{\delta K}{K}\right)^2 + \left(\frac{\delta d}{d}\right)^2 + \left(\frac{0.82 \, \delta S}{1 - 0.82 S}\right)^2 + \left(\frac{\delta \eta}{\eta}\right)^2}$$

### 6. Ultra-Fast Speedup Timings ($1\text{s/s} \to 1\text{h/s} \text{ ⚡}$)
Combines explicit CFL-stable sub-stepping with analytical steady-state spatial relaxation leaps, allowing users to observe hours or days of permeation time-evolution in seconds with zero numerical oscillations.

### 7. Dual Visualizers
- **Macro View**: Smooth bilinear heatmap rendering with 5 colormaps (*Thermal Fire*, *Viridis*, *Plasma*, *Cyber Neon*, *Oceanic Teal*) and marching isolines.
- **Micro View**: Structural lipid bilayer visualizer featuring hydrophilic head groups and thermal wiggling acyl tails whose order and alignment adapt dynamically to lipid order parameter $S$ and fluidity $\eta$.

---

## 🎛 Interactivity & Presets

- **Interactive Canvas Painting**: Click and drag on the 2D canvas with **Source**, **Sink**, or **Erase** tools to inject custom concentration profiles or barrier geometries.
- **Preset Scenarios**:
  - *Passive Transcellular Diffusion*
  - *Lipophilic Compound (High $K = 3.5$)*
  - *Hydrophilic Barrier (Low $K = 0.15$)*
  - *Rigid Gel Phase ($L_\beta$, High Order $S = 0.90$)*
  - *Fluid Disordered Phase ($L_\alpha$, High Fluidity $\eta = 0.85$)*
  - *Transmembrane Channel Pore*
  - *Concentration Wave Pulse*

---

## 📁 Repository Structure

```
2D-permeability-simulator/
├── index.html          # Main HTML5 layout & glassmorphic application UI
├── css/
│   └── styles.css      # Dark scientific CSS styling system & responsive layout
├── js/
│   ├── physics.js      # 2D Finite Difference Fickian PDE solver & particle engine
│   ├── render.js       # Heatmap canvas renderer, colormaps & lipid bilayer animation
│   ├── charts.js       # Real-time 1D C(x) profile & J(t) flux charts
│   ├── controls.js     # User interaction bindings, presets & slider handlers
│   └── app.js          # Animation loop orchestrator & state manager
└── README.md           # Application documentation & scientific overview
```

---

## 💻 Local Development

1. **Clone Repository**:
   ```bash
   git clone https://github.com/KarelBerka/2D-permeability-simulator.git
   cd 2D-permeability-simulator
   ```

2. **Run Local Server**:
   You can serve the files using any simple HTTP server:
   ```bash
   # Python 3
   python -m http.server 8080
   ```
   Open `http://localhost:8080` in your web browser.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

## ✉ Contact & Contributions

Created & maintained by **Karel Berka**. Contributions, suggestions, and scientific feedback are welcome!
- Repository: [https://github.com/KarelBerka/2D-permeability-simulator](https://github.com/KarelBerka/2D-permeability-simulator)
