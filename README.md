# 2D Membrane Permeability & Diffusion Simulator

An interactive, high-performance web application for visualizing and simulating 2D non-steady-state solute diffusion and passive permeation across lipid bilayer membranes.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00F2FE?style=for-the-badge&logo=github)](https://karelberka.github.io/2D-permeability-simulator/)
[![License](https://img.shields.io/badge/License-MIT-00F5D4?style=for-the-badge)](LICENSE)

---

## 🔬 Overview & Theoretical Principles

The **2D Membrane Permeability & Diffusion Simulator** provides a quantitative visual environment to simulate solute diffusion across biological lipid bilayer membranes based on Fickian diffusion theory, Overton's solubility-diffusion rule, Perrin hydrodynamic friction theory, and Arrhenius thermal activation.

---

## 📐 Comprehensive Mathematical & Physical Formulation

### 1. Fick's 2nd Law & Chemical Potential PDE
Mass transport across phase boundaries with step-function partition coefficients $K$ is modeled using continuous chemical potential $u(x,y,t)$:

$$\frac{\partial C(x,y,t)}{\partial t} = \nabla \cdot \left( \hat{D}(x,y) \, \nabla u(x,y,t) \right)$$

where $u(x,y,t)$ relates to solute concentration $C(x,y,t)$ by:

$$u(x,y,t) = \begin{cases} C(x,y,t) & \text{in aqueous reservoirs} \\ \frac{C(x,y,t)}{K} & \text{inside hydrophobic lipid core} \end{cases}$$

At thermodynamic equilibrium across the lipid-water interface ($u_{\text{water}} = u_{\text{membrane}}$), Overton's partition jump condition holds:

$$C_{\text{membrane}} = K \cdot C_{\text{water}}$$

---

### 2. Molecular Weight, Hydrodynamic Radius & Perrin Shape Factors
Solute size is determined by equivalent spherical radius $R_{\text{eq}}$ derived from molecular weight ($MW$ in Da):

$$R_{\text{eq}} = 0.066 \cdot (MW)^{1/3} \quad [\text{nm}]$$

Hydrodynamic radius $r_h$ incorporates molecular geometry through the Perrin ellipsoid friction factor $f_{\text{shape}}$ ($r_h = R_{\text{eq}} \cdot f_{\text{shape}}$):

- **Sphere / Isometric**:
  $$f_{\text{shape}} = 1.0$$

- **Prolate Ellipsoid (Rod / Cylinder)** with aspect ratio $p = a/b$:
  $$f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \ln\left(p + \sqrt{p^2 - 1}\right)}$$

- **Oblate Ellipsoid (Disc / Planar Ring)** with aspect ratio $p = a/b$:
  $$f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \arctan\left(\sqrt{p^2 - 1}\right)}$$

---

### 3. Temperature Scaling (Arrhenius Equation)
Aqueous self-diffusion $D_{\text{water}}(T)$ scales with temperature $T$ (in Kelvin) relative to reference temperature $T_0 = 298.15\text{ K}$ ($25^\circ\text{C}$):

$$D_{\text{water}}(T) = D_0 \cdot \exp\left(-\frac{E_a}{R T} + \frac{E_a}{R T_0}\right)$$

where $E_a / R \approx 2180\text{ K}$. This accurately scales $D_{\text{water}}$ from $2.30 \times 10^{-5}\text{ cm}^2/\text{s}$ at $25^\circ\text{C}$ (room temperature) to $3.00 \times 10^{-5}\text{ cm}^2/\text{s}$ at $37^\circ\text{C}$ (human body temperature).

---

### 4. Hydrophobic Membrane Core Diffusion
Diffusion within hydrocarbon acyl chains $D_{\text{mem}}$ incorporates steric free-volume hindrance ($\gamma_{\text{mem}} \approx 1.6 \times 10^{-4}$), membrane fluidity $\eta$, lipid order parameter $S$, and solute shape:

$$D_{\text{mem}} = D_{\text{water}}(T) \cdot \gamma_{\text{mem}} \cdot \eta \cdot (1 - 0.82 \, S) \cdot \left(\frac{0.17}{r_h}\right)^{0.6} \cdot \frac{1}{\sqrt{f_{\text{shape}}}}$$

---

### 5. Overton's Permeability, Steady-State Flux & Lag Time
- **Macroscopic Permeability ($P$)**:
  $$P = \frac{K \cdot D_{\text{mem}}}{d} \quad [\text{cm/s}]$$
  where $d$ is membrane thickness ($2.0 - 10.0\text{ nm}$).

- **Steady-State Solute Flux ($J_{\text{ss}}$)**:
  $$J_{\text{ss}} = P \cdot \Delta C = P \cdot (C_{\text{donor}} - C_{\text{receiver}}) \quad [\text{mol}/\text{cm}^2\text{s}]$$

- **Theoretical Physical Lag Time ($\tau_{\text{lag}}$)**:
  $$\tau_{\text{lag}} = \frac{d^2}{6 \, D_{\text{mem}}}$$

---

### 6. Thermal & Fluctuation Uncertainty Bounds ($\sigma$)
Uncertainties from structural and thermal fluctuations ($\delta K, \delta S, \delta \eta, \delta D$) propagate into permeability uncertainty $\sigma_P$ and logarithmic permeability uncertainty $\sigma_{\log_{10}P}$:

$$\frac{\sigma_P}{P} = \sqrt{ \left(\frac{\delta K}{K}\right)^2 + \left(\frac{\delta D}{D}\right)^2 + \left(\frac{0.82 \, \delta S}{1 - 0.82 S}\right)^2 + \left(\frac{\delta \eta}{\eta}\right)^2 }$$

$$\sigma_{\log_{10}P} = \frac{1}{\ln 10} \cdot \frac{\sigma_P}{P}$$

---

### 7. Numerical PDE Discretization & 2-Way Gauss-Seidel Solver
The 2D spatial domain ($160 \times 50$ grid) uses harmonic mean effective interface diffusivities:

$$D_{i+1/2, j} = \frac{2 D_{i,j} D_{i+1,j}}{D_{i,j} + D_{i+1,j} + \epsilon}$$

Exponential Euler relaxation sweeps update chemical potential $u_{i,j}$:

$$u_{i,j}^{(k+1)} = u_{i,j}^{(k)} + \left(1 - e^{-\sum D_{\text{neighbors}} \cdot \Delta t_{\text{sub}}}\right) \cdot \left( \frac{\sum D_{\text{neighbor}} \, u_{\text{neighbor}}}{\sum D_{\text{neighbors}}} - u_{i,j}^{(k)} \right)$$

Alternating 2-way Gauss-Seidel directional sweeps (forward and backward) with adaptive substep scaling ($\Delta t_{\text{sub}}$) guarantee fast spatial propagation and unconditional CFL numerical stability across time speedups from $1\text{s/s}$ to $1\text{h/s}$.

---

## 🚀 Key Features & Highlights

- **Solubility-Diffusion Model**: Calculates $P$, $D_{\text{mem}}$, $J_{\text{ss}}$, and $\tau_{\text{lag}}$ calibrated against MolMeDB experimental baselines (e.g. Ibuprofen MM00045 on POPC bilayer at $37^\circ\text{C}$).
- **Built-in Solute Presets**:
  - *Water Molecule*: $18\text{ Da}, r_h = 0.15\text{ nm}$
  - *Monovalent Ion ($\text{Na}^+/\text{Cl}^-$)*: $30\text{ Da}, r_h = 0.25\text{ nm}$
  - *Small Organic / Sugar*: $100\text{ Da}, r_h = 0.40\text{ nm}$
  - *Ibuprofen (MolMeDB MM00045)*: $206\text{ Da}, K = 3.05, r_h = 0.45\text{ nm}$
  - *Small Drug Molecule*: $300\text{ Da}, r_h = 0.70\text{ nm}$
  - *Macrocycle / Cyclic Peptide*: $1000\text{ Da}, r_h = 1.20\text{ nm}$
  - *Biopolymer / Oligo*: $3000\text{ Da}, r_h = 2.00\text{ nm}$
- **Thermodynamic Langevin Particle Dynamics**: Brownian particle cloud with interface entry/exit probabilities ($P_{\text{entry}} = \min(1.0, K)$, $P_{\text{exit}} = \min(1.0, 1/K)$).
- **Logarithmic $\log_{10}P$ Mode**: Toggle linear ($P\text{ cm/s}$) or logarithmic ($\log_{10}P$) displays with uncertainty bounds ($\pm \sigma$).
- **Dual Visualizers**:
  - *Macro View*: Bilinear heatmap rendering with 5 colormaps (*Thermal Fire*, *Viridis*, *Plasma*, *Cyber Neon*, *Oceanic Teal*) and isolines.
  - *Micro View*: Structural lipid bilayer visualizer showing hydrophilic heads and animated acyl tails reflecting order $S$ and fluidity $\eta$.

---

## 🎛 Interactivity & Presets

- **Interactive Canvas Painting**: Click and drag on the 2D canvas with **Source**, **Sink**, or **Erase** tools.
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
