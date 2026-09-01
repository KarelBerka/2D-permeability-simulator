# 2D Membrane Permeability & Diffusion Simulator (Dual-Solute & Crystallization)

An interactive, high-performance web application for visualizing and simulating 2D non-steady-state dual-solute diffusion, cross-solute interactions, concentration-dependent solubility limits, crystallization kinetics, and passive permeation across lipid bilayer membranes.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00F2FE?style=for-the-badge&logo=github)](https://karelberka.github.io/2D-permeability-simulator/)
[![License](https://img.shields.io/badge/License-MIT-00F5D4?style=for-the-badge)](LICENSE)

---

## 🔬 Overview & Theoretical Principles

The **2D Membrane Permeability & Diffusion Simulator** provides a quantitative visual environment to simulate solute transport across biological lipid bilayer membranes based on:
- **Coupled Dual-Solute Fickian Diffusion** with chemical potential jump conditions.
- **Flory-Huggins Cross-Solute Interactions ($\chi_{AB}$)** modeling competitive steric crowding or co-transport.
- **Concentration Dependence & Solubility Limits ($C_{\text{sat}}$)** with nucleation, precipitation kinetics, and dissolution.
- **Membrane Surface Fouling & Cake Resistance** caused by solid crystal deposition.
- **Overton's Solubility-Diffusion Rule**, **Perrin Hydrodynamic Friction Theory**, and **Arrhenius Thermal Activation**.

---

## 📐 Mathematical & Physical Formulation

### 1. Fick's 2nd Law & Chemical Potential Formulation
Mass transport across phase boundaries with step-function partition coefficients $K$ is modeled using continuous chemical potential $u(x,y,t)$:

$$\frac{\partial C_{\text{free}}(x,y,t)}{\partial t} = \nabla \cdot \left( \hat{D}(x,y) \, \nabla u(x,y,t) \right)$$

where $u(x,y,t)$ relates to free dissolved solute concentration $C_{\text{free}}(x,y,t)$ by:

$$u(x,y,t) = \begin{cases} C_{\text{free}}(x,y,t) & \text{in aqueous reservoirs} \\ \frac{C_{\text{free}}(x,y,t)}{K} & \text{inside hydrophobic lipid core} \end{cases}$$

At thermodynamic equilibrium across the lipid-water interface ($u_{\text{water}} = u_{\text{membrane}}$), Overton's partition jump condition holds:

$$C_{\text{membrane}} = K \cdot C_{\text{water}}$$

---

### 2. Cross-Solute Coupling & Interactions ($\chi_{AB}$)
Mutual interactions between Solute A and Solute B in concentrated mixtures are captured via interaction parameter $\chi_{AB}$:
- **Steric Crowding / Repulsion ($\chi_{AB} > 0$):** High local concentration of Solute B reduces effective available volume for Solute A:
  $$u_A^{\text{eff}} = \frac{u_A}{1 + 0.3 \, \chi_{AB} \, C_B}$$
- **Co-Transport / Attraction ($\chi_{AB} < 0$):** Facilitated transport through weak mutual associations.

---

### 3. Concentration Dependence, Solubility Limits & Crystallization Kinetics
Transport occurs across two regimes toggleable by the user:

#### 💧 Infinite Dilution Mode
Assumes ideal dilute solutions ($C_{\text{sat}} \to \infty$) where all solute exists as free monomers with linear flux response $J \propto \Delta C$.

#### 💎 Crystallization & Solubility Mode
When total local concentration exceeds aqueous solubility limit ($C_{\text{free}} > C_{\text{sat}}$), supersaturation occurs ($\Delta C = C_{\text{free}} - C_{\text{sat}} > 0$). Excess solute nucleates and precipitates into solid crystalline fraction $C_{\text{precip}}$:

$$\frac{\partial C_{\text{precip}}}{\partial t} = k_{\text{cryst}} \cdot \max\left(0, \frac{C_{\text{free}} - C_{\text{sat}}}{C_{\text{sat}}}\right) - k_{\text{dissol}} \cdot C_{\text{precip}}$$

- **Free Monomer Activity:** Only dissolved $C_{\text{free}} \le C_{\text{sat}}$ drives chemical potential $u$ and partitions into the lipid bilayer.
- **Saturation Flux Plateau:** Flux plateaus at high concentration rather than increasing indefinitely.
- **Membrane Surface Fouling / Cake Layer:** Precipitated crystals depositing at the donor-membrane boundary ($x = x_{\text{memStart}}$) form a physical cake layer that increases barrier diffusion resistance:
  $$D_{\text{eff}}(x, y) = \frac{D_{\text{base}}(x, y)}{1 + r_{\text{cake}} \cdot (C_{\text{precip}, A} + C_{\text{precip}, B})}$$
  $$P_{\text{eff}} = \frac{P_0}{1 + r_{\text{cake}} \cdot \bar{C}_{\text{precip, surface}}}$$

---

### 4. Molecular Weight, Hydrodynamic Radius & Perrin Shape Factors
Solute size is determined by equivalent spherical radius $R_{\text{eq}}$ derived from molecular weight ($MW$ in Da):

$$R_{\text{eq}} = 0.066 \cdot (MW)^{1/3} \quad [\text{nm}]$$

Hydrodynamic radius $r_h$ incorporates molecular geometry through Perrin friction factor $f_{\text{shape}}$ and water hydration shell factor:

$$r_h = R_{\text{eq}} \cdot f_{\text{shape}} \cdot (1 + 0.18 \cdot \text{Hydration})$$

- **Sphere / Isometric**:
  $$f_{\text{shape}} = 1.0$$
- **Prolate Ellipsoid (Rod / Cylinder)** with aspect ratio $p = a/b$:
  $$f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \ln\left(p + \sqrt{p^2 - 1}\right)}$$
- **Oblate Ellipsoid (Disc / Planar Ring)** with aspect ratio $p = a/b$:
  $$f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \arctan\left(\sqrt{p^2 - 1}\right)}$$

---

### 5. Temperature Scaling (Arrhenius Equation)
Aqueous self-diffusion $D_{\text{water}}(T)$ scales with temperature $T$ relative to reference temperature $T_0 = 298.15\text{ K}$ ($25^\circ\text{C}$):

$$D_{\text{water}}(T) = D_0 \cdot \exp\left(-\frac{E_a}{R T} + \frac{E_a}{R T_0}\right)$$

where $E_a / R \approx 2180\text{ K}$, scaling $D_{\text{water}}$ from $2.30 \times 10^{-5}\text{ cm}^2/\text{s}$ at $25^\circ\text{C}$ to $3.00 \times 10^{-5}\text{ cm}^2/\text{s}$ at $37^\circ\text{C}$ (human body temperature).

---

### 6. Hydrophobic Membrane Core Diffusion & Effective Permeability
Diffusion within hydrocarbon acyl chains $D_{\text{mem}}$ incorporates steric free-volume hindrance ($\gamma_{\text{mem}} \approx 1.6 \times 10^{-4}$), membrane affinity, fluidity $\eta$, lipid order parameter $S$, and solute shape:

$$D_{\text{mem}} = D_{\text{water}}(T) \cdot \gamma_{\text{mem}} \cdot (0.5 + \text{Affinity}) \cdot \eta \cdot (1 - 0.82 \, S) \cdot \left(\frac{0.17}{r_h}\right)^{0.6} \cdot \frac{1}{\sqrt{f_{\text{shape}}}}$$

- **Effective Permeability ($P_{\text{eff}}$)**:
  $$P_{\text{eff}} = \frac{K \cdot D_{\text{mem}}}{d \cdot (1 + r_{\text{cake}} \cdot C_{\text{precip}})} \quad [\text{cm/s}]$$
- **Theoretical Physical Lag Time ($\tau_{\text{lag}}$)**:
  $$\tau_{\text{lag}} = \frac{d^2}{6 \, D_{\text{mem}}} \cdot (1 + r_{\text{cake}} \cdot C_{\text{precip}})$$

---

## 🚀 Key Features & Highlights

- **Dual-Solute Simulation**: Simultaneous tracking and visualization of **Solute A (Blue)** and **Solute B (Red)** with individual partition coefficients, hydrodynamic radii, and initial concentrations.
- **Physical Regime Switch**: One-click toggle between **💧 Infinite Dilution Mode** and **💎 Crystallization Mode**.
- **Visual Crystallization & Cake Layer**: Shimmering diamond micro-crystals on the 2D canvas and visible membrane surface crust.
- **Dual Visualizers**:
  - *Macro Heatmap*: Single-solute or composite dual-solute RGB heatmap overlay with dynamic isolines.
  - *Micro View*: Animated lipid bilayer heads/tails responding to lipid order $S$ and fluidity $\eta$.
  - *Dual Solute Mode*: Direct toolbar toggle for simultaneous multi-solute inspection.
- **Dynamic 1D & Time-Series Charts**:
  - *1D Concentration Profile $C(x)$*: Real-time cross-sectional averages showing free monomers, shaded precipitate layers, and dashed $C_{\text{sat}}$ threshold lines, with Auto-Fit and $\log_{10}$ scaling modes.
  - *Permeation Accumulation $J(t)$*: Receiver chamber accumulation showing saturation plateaus and fouling lag.
- **Comparative Metrics Table**: Side-by-side comparison of $D_{\text{wat}}$, $D_{\text{mem}}$, $P_{\text{eff}}$, $\log_{10}P$, $C_{\text{sat}}$, % Precipitated, and $\tau_{\text{lag}}$.

---

## 📁 Repository Structure

```
2D-permeability-simulator/
├── index.html          # HTML5 layout, toolbar, regime toggle & side-by-side metrics
├── css/
│   └── styles.css      # Dark scientific UI styling, responsive grid & animations
├── js/
│   ├── physics.js      # 2D coupled Fickian PDE solver, crystallization kinetics & particle engine
│   ├── render.js       # Heatmap renderer, lipid bilayer animation & crystal graphics
│   ├── charts.js       # Dynamic 1D C(x) profiles, C_sat lines & J(t) accumulation charts
│   ├── controls.js     # User interaction bindings, presets, regime switch & slider handlers
│   └── app.js          # Animation loop orchestrator & state manager
└── README.md           # Application documentation & scientific formulation
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
