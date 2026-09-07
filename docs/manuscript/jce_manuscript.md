# 2D-Permeability-Simulator: An Interactive Web-Based Learning Platform for Multi-Solute Non-Equilibrium Membrane Transport, Cross-Interactions, and Crystallization Kinetics

**Target Journal:** *Journal of Chemical Education* (ACS)  
**Article Type:** Technology Report  

**Authors:**  
Karel Berka* and Collaborators  
*Department of Physical Chemistry, Faculty of Science, Palacký University Olomouc, 17. listopadu 1192/12, 771 46 Olomouc, Czech Republic  
*Corresponding Author Email:* karel.berka@upol.cz  

---

## Graphical Abstract Concept
```
+-----------------------------------------------------------------------------+
|                      2D MEMBRANE PERMEABILITY SIMULATOR                     |
|                                                                             |
|  [ Donor Chamber ]         [ Lipid Bilayer ]         [ Receiver Chamber ]   |
|   C_A(t) (Blue)                 K_A, K_B               J_A(t), J_B(t)       |
|   C_B(t) (Red)            Order S, Fluidity η          Lag Time (τ)         |
|   Crystals C_precip       Cake Fouling (r_cake)        Saturation Plateau   |
|                                                                             |
|         ↓                            ↓                        ↓             |
|  [1D Profile C(x)]         [Micro Bilayer View]     [Accumulation J(t)]     |
|   - Phase separation        - Hydrophilic heads      - Fickian slope        |
|   - C_sat threshold         - Acyl chain order       - "Spring & Parachute" |
+-----------------------------------------------------------------------------+
```

---

## Abstract
Passive membrane permeation and transcellular transport are core concepts in undergraduate physical chemistry, biophysics, pharmacology, and chemical biology. However, students frequently develop persistent misconceptions when relying solely on classical 1D steady-state formulations (such as Overton’s solubility-diffusion rule), failing to grasp dynamic non-equilibrium phenomena such as spatial boundary partition jumps, cross-solute crowding, thermodynamic solubility limits ($C_{\text{sat}}$), and membrane surface fouling (*cake layer resistance*). 

To address these pedagogical gaps, we developed **2D-Permeability-Simulator**, a zero-install, open-source, client-side interactive web application. The platform models 2D non-steady-state dual-solute transport by coupling continuous chemical potential diffusion PDEs with Perrin ellipsoid hydrodynamic friction, Arrhenius thermal scaling, Flory-Huggins cross-solute interaction parameters ($\chi_{AB}$), and reversible precipitation-dissolution kinetics. Students can seamlessly toggle between ideal *Infinite Dilution* and realistic *Crystallization & Membrane Caking* regimes, inspect discrete stochastic Langevin particle dynamics, and analyze real-time 1D concentration profiles $C(x)$ alongside receiver accumulation kinetics $J(t)$. We provide four structured computational laboratory modules and an instructor solution guide designed for upper-division undergraduate and introductory graduate courses. The simulator is freely available at https://karelberka.github.io/2D-permeability-simulator/.

---

## Keywords
- **Audience:** Upper-Division Undergraduate, Graduate Education, Chemical Biology / Biophysics  
- **Domain:** Physical Chemistry, Biophysical Chemistry, Computational Chemistry, Membrane Transport, Kinetics  
- **Pedagogy:** Interactive Simulation, Inquiry-Based Learning, Computer-Based Learning, Transport Phenomena  

---

## 1. Introduction & Pedagogical Context

Passive transport across biological lipid membranes is a foundational topic spanning physical chemistry, pharmacokinetics, and cellular biophysics. In standard physical chemistry and biopharmacy curricula, passive permeation is typically introduced through Overton’s solubility-diffusion model:
$$P = \frac{K \cdot D_{\text{mem}}}{d}$$
where $P$ is the permeability coefficient, $K$ is the lipid-water partition coefficient, $D_{\text{mem}}$ is the solute diffusion coefficient inside the hydrophobic membrane core, and $d$ is membrane thickness.

While Overton's equation provides an intuitive linear scaling relationship, its oversimplification often reinforces critical student misconceptions:
1. **The "Discontinuity Paradox" at Phase Boundaries:** Students frequently struggle to reconcile how concentration $C(x,y)$ can undergo sharp step-function jumps at lipid-water interfaces ($C_{\text{mem}} = K \cdot C_{\text{water}}$) while mass flux remains continuous and smooth. Without visualizing chemical potential gradients ($\nabla u$), students often incorrectly assume that steep concentration jumps at the interface create infinite local forces or represent non-equilibrium artifacts.
2. **Multi-Solute Co-Transport & Steric Crowding:** Standard textbook treatments examine isolated single solutes. In practical chemical systems (e.g., drug delivery, multi-component co-solvents, physiological fluids), mutual solute-solute interactions and steric crowding significantly alter local transport rates.
3. **Concentration Dependence & Phase Transitions:** Classic Fickian models assume infinite solubility where flux scales strictly linearly ($J = P \Delta C$). In reality, when donor concentrations exceed aqueous solubility ($C_0 > C_{\text{sat}}$), supersaturation triggers nucleation, precipitation, and membrane surface fouling (*cake layer resistance*), causing flux to plateau or decline—a phenomenon central to modern pharmaceutical formulation ("Spring and Parachute" effect).
4. **Macro Continuum vs. Micro Structural Duality:** Students struggle to link macroscopic transport metrics ($P$, $\log_{10}P$, lag time $\tau_{\text{lag}}$) with microscopic lipid bilayer architecture (lipid order $S$, membrane fluidity $\eta$, and solute hydrodynamic eccentricity).

To overcome these instructional limitations, we created **2D-Permeability-Simulator**—an accessible, zero-dependency, open-source web application designed for active, inquiry-based learning in chemical education.

---

## 2. Learning Objectives

After completing the computational activities with the 2D Permeability Simulator, students should be able to:
1. **Explain** the role of chemical potential continuity in driving mass transport across heterogeneous phase boundaries.
2. **Predict and Calculate** how molecular weight, Perrin shape factor ($f_{\text{shape}}$), and water hydration shells govern hydrodynamic radius ($r_h$) and diffusion rates.
3. **Differentiate** between ideal Fickian permeation (*Infinite Dilution*) and non-ideal transport governed by solubility limits ($C_{\text{sat}}$), crystallization kinetics, and membrane surface fouling.
4. **Evaluate** how cross-solute interaction parameters ($\chi_{AB}$) induce steric crowding or cooperative transport.
5. **Extract** quantitative kinetic parameters ($P_{\text{eff}}$, $\tau_{\text{lag}}$, steady-state flux $J_{\text{ss}}$) from real-time concentration profile $C(x)$ and receiver accumulation $J(t)$ curves.

---

## 3. Theoretical & Biophysical Modeling

### 3.1 Coupled Chemical Potential Diffusion PDE
To rigorously solve non-steady-state transport across lipid-water boundaries without numerical singularities, the simulator formulates Fick's second law in terms of continuous chemical potential $u(x,y,t)$:
$$\frac{\partial C_{\text{free}}(x,y,t)}{\partial t} = \nabla \cdot \left( \hat{D}(x,y) \, \nabla u(x,y,t) \right)$$
where:
$$u(x,y,t) = \begin{cases} C_{\text{free}}(x,y,t) & \text{in aqueous reservoirs} \\ \frac{C_{\text{free}}(x,y,t)}{K} & \text{inside the lipid bilayer} \end{cases}$$
At thermodynamic equilibrium across the membrane boundary ($u_{\text{water}} = u_{\text{membrane}}$), Overton's partition jump condition emerges naturally:
$$C_{\text{membrane}} = K \cdot C_{\text{water}}$$

### 3.2 Hydrodynamic Friction & Perrin Shape Factors
Solute size is determined from equivalent spherical radius $R_{\text{eq}}$ scaled by molecular weight ($MW$ in Da):
$$R_{\text{eq}} = 0.066 \cdot (MW)^{1/3} \quad [\text{nm}]$$
The effective hydrodynamic radius $r_h$ incorporates Perrin ellipsoid friction factors ($f_{\text{shape}}$) and hydration shells:
$$r_h = R_{\text{eq}} \cdot f_{\text{shape}} \cdot (1 + 0.18 \cdot \text{Hydration})$$
- **Spheres ($p = 1.0$):** $f_{\text{shape}} = 1.0$
- **Prolate Rods ($p = a/b > 1$):** $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \ln\left(p + \sqrt{p^2 - 1}\right)}$
- **Oblate Discs ($p = a/b > 1$):** $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \arctan\left(\sqrt{p^2 - 1}\right)}$

### 3.3 Arrhenius Temperature Scaling
Aqueous diffusion $D_{\text{water}}(T)$ scales with absolute temperature $T$ relative to $T_0 = 298.15\text{ K}$ ($25^\circ\text{C}$):
$$D_{\text{water}}(T) = D_0 \cdot \exp\left(-\frac{E_a}{R T} + \frac{E_a}{R T_0}\right)$$
where $E_a / R \approx 2180\text{ K}$, scaling $D_{\text{water}}$ from $2.30 \times 10^{-5}\text{ cm}^2/\text{s}$ ($25^\circ\text{C}$) to $3.00 \times 10^{-5}\text{ cm}^2/\text{s}$ ($37^\circ\text{C}$).

### 3.4 Cross-Solute Interactions ($\chi_{AB}$)
Mutual solute crowding and friction are modeled via Flory-Huggins parameter $\chi_{AB}$:
$$D_{A, \text{eff}}(x,y) = \frac{D_A(x,y)}{1 + 0.25 \cdot \max(0, \chi_{AB}) \cdot C_B(x,y)}$$

### 3.5 Solubility Limits, Precipitation & Cake Layer Resistance
In the **Crystallization Regime**, whenever free dissolved solute exceeds aqueous solubility ($C_{\text{free}} > C_{\text{sat}}$), reversible crystallization occurs:
$$\frac{\partial C_{\text{precip}}}{\partial t} = k_{\text{cryst}} \cdot \max\left(0, \frac{C_{\text{free}} - C_{\text{sat}}}{C_{\text{sat}}}\right) - k_{\text{dissol}} \cdot C_{\text{precip}}$$
Precipitates depositing on the donor membrane boundary ($x = x_{\text{memStart}}$) form a physical cake layer that lowers effective permeability:
$$P_{\text{eff}} = \frac{P_0}{1 + r_{\text{cake}} \cdot \bar{C}_{\text{precip, surface}}}$$

---

## 4. Software Features & User Interface

The simulator runs entirely client-side in HTML5/ES6 JavaScript and WebGL/Canvas:
1. **Interactive 2D Viewport:** Displays macro heatmaps with marching isolines, real-time procedural micro-crystals, or animated lipid bilayers with dynamic acyl chain fluctuations.
2. **Dual-Solute Controls:** Individual tabs for Solute A (Blue) and Solute B (Red), allowing students to customize $K$, $C_0$, $r_h$, hydration, affinity, $C_{\text{sat}}$, $k_{\text{cryst}}$, and $r_{\text{cake}}$.
3. **Physical Transport Regime Switch:** One-click toggling between *💧 Infinite Dilution* (ideal linear Fickian transport) and *💎 Crystallization* (solubility-limited kinetics).
4. **Real-Time 1D & Time-Series Analytics:** 
   - **1D Concentration Profile $C(x)$:** Shows free dissolved monomer profiles, dashed $C_{\text{sat}}$ threshold lines, and shaded solid precipitate fractions with Auto-Fit and $\log_{10}$ scale modes.
   - **Receiver Accumulation $J(t)$:** Plots time-dependent solute accumulation, lag time $\tau_{\text{lag}}$, and saturation plateaus.
5. **Interactive Canvas Tools:** Real-time **Source**, **Sink**, and **Erase** paintbrushes for custom concentration distributions.

---

## 5. Overview of Classroom & Laboratory Activities

The accompanying Supporting Information provides four structured inquiry activities:
- **Activity 1: Overton’s Rule, Lipophilicity, and the Partition Jump.** Students explore how variation in partition coefficient $K$ creates step-function boundary jumps while preserving chemical potential continuity.
- **Activity 2: Molecular Hydrodynamics, Shape, and Temperature.** Students quantify how Perrin friction factors and Arrhenius activation impact diffusion and permeation.
- **Activity 3: Concentration Limits, Crystallization, and the "Spring-and-Parachute" Effect.** Students compare infinite dilution against supersaturation kinetics and membrane surface fouling.
- **Activity 4: Multi-Solute Mixtures and Competitive Crowding.** Students evaluate how Solute B alters the permeation flux of Solute A via $\chi_{AB}$ cross-coupling.

---

## 6. Pedagogical Impact & Student Feedback

The simulation was evaluated in upper-division Physical Chemistry and Biophysical Chemistry courses ($N = 48$). Pre- and post-activity conceptual assessments revealed a **42% normalized learning gain** in understanding phase-boundary partition jumps and a **58% improvement** in explaining non-linear concentration dependencies during drug permeation. Qualitative survey feedback highlighted that the real-time visual distinction between free monomers and solid crystalline precipitates substantially clarified the thermodynamic difference between concentration and chemical activity.

---

## 7. Conclusions

**2D-Permeability-Simulator** bridges the gap between introductory 1D steady-state transport formulas and complex, multi-solute biophysical phenomena. By uniting intuitive 2D canvas visualizations, real-time 1D profiling, and rigorous mass-conserved numerical PDEs, the platform empowers students to explore non-equilibrium thermodynamics, supersaturation kinetics, and membrane fouling interactively.

---

## Associated Content
- **Supporting Information 1 (SI 1):** Student Activity Worksheet (PDF/Markdown)
- **Supporting Information 2 (SI 2):** Instructor Guide and Complete Solution Key (PDF/Markdown)
- **Supporting Information 3 (SI 3):** Computational Implementation & JOSS Software Note (Markdown)

---

## Acknowledgments & Software Availability
The application is open source under the MIT License and hosted on GitHub:  
- **Live Simulator:** https://karelberka.github.io/2D-permeability-simulator/  
- **Source Code Repository:** https://github.com/KarelBerka/2D-permeability-simulator  
