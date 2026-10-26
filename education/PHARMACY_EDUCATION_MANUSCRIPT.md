# 2D-Permeability-Simulator: An Interactive Web-Based Learning Platform for Membrane Transport, Biopharmaceutics, and Drug Formulation Kinetics

**Target Journals:** *American Journal of Pharmaceutical Education* (AJPE) / *Currents in Pharmacy Teaching and Learning* (CPTL) / *Journal of Chemical Education* (JCE)  
**Article Type:** Educational Tool / Instructional Design / Technology Report  

**Author:**  
Karel Berka*  
*Department of Physical Chemistry, Faculty of Science, Palacký University Olomouc, 17. listopadu 1192/12, 771 46 Olomouc, Czech Republic  
*Corresponding Author Email:* `karel.berka@upol.cz`  

---

## Abstract

Passive membrane permeation, transcellular drug absorption, and aqueous solubility limits are core foundational concepts in pharmacy, biopharmaceutics, and pharmacokinetics education. However, pharmacy students frequently encounter conceptual bottlenecks when interpreting drug transport exclusively through static one-dimensional formulas such as Overton's rule ($P = K \cdot D / d$) or Fick's first law. Crucial dynamic phenomena—including the distinction between thermodynamic chemical potential and concentration jumps at lipid interfaces, the influence of membrane fluidity, cross-solute interactions, supersaturation kinetics, and surface cake layer resistance caused by drug precipitation—remain abstract and poorly integrated. 

To bridge this pedagogical gap, we created **2D-Permeability-Simulator** (https://karelberka.github.io/2D-permeability-simulator/), an open-source, client-side, zero-install web application for interactive 2D non-steady-state dual-solute diffusion modeling. The platform couples continuous chemical potential diffusion PDEs with Stokes-Einstein hydrodynamic drag, Perrin shape factors, Arrhenius temperature activation, Flory-Huggins cross-solute interaction parameters ($\chi_{AB}$), and reversible crystallization-dissolution kinetics. Furthermore, two dedicated educational minisimulators allow students to isolate and manipulate the partition coefficient ($K / \log P$) and the diffusion coefficient ($D$) independently before synthesizing them into Overton's equation. 

This paper presents the theoretical design of the simulator, outlines four inquiry-based learning modules directly aligned with the Biopharmaceutics Classification System (BCS) and formulation science (such as the "spring-and-parachute" effect), and provides a comprehensive instructor guide with student evaluation rubrics.

**Keywords:** Pharmacy Education, Biopharmaceutics, Membrane Permeability, Pharmacokinetics, Overton's Rule, Computer-Assisted Instruction, Active Learning, Crystallization Kinetics.

---

## 1. Introduction & Educational Context

In professional pharmacy programs (PharmD and BS in Pharmaceutical Sciences), understanding how drug molecules traverse biological membranes is fundamental to mastering **Biopharmaceutics**, **Pharmacokinetics (PK)**, and **Pharmaceutical Dosage Form Design** [1]. Students must evaluate how physicochemical properties—such as lipophilicity ($\log P$), molecular size, ionization, and aqueous solubility—govern oral drug bioavailability according to the Biopharmaceutics Classification System (BCS) [2].

Historically, introductory curricula introduce passive transcellular absorption through Overton's solubility-diffusion model:

$$P = \frac{K \cdot D_{\text{mem}}}{d}$$

where $P$ is the effective permeability coefficient, $K$ is the lipid/water partition coefficient, $D_{\text{mem}}$ is the solute diffusion coefficient within the membrane's hydrophobic core, and $d$ is membrane thickness [3].

While Overton's equation provides a foundational conceptual heuristic, relying exclusively on static 1D equations creates persistent student misconceptions:
1. **The Phase-Boundary "Concentration Discontinuity Paradox":** When introduced to $C_{\text{mem}} = K \cdot C_{\text{water}}$, students often assume that concentration must be continuous, or conversely, that a sharp step-function jump at the lipid-water interface implies an instantaneous barrier or non-equilibrium artifact. Without visualizing the continuous chemical potential gradient ($\nabla u$), students struggle to understand how steady diffusion flux is maintained across a discontinuous concentration profile.
2. **Conflating Thermodynamic Partitioning ($K$) with Kinetic Diffusion ($D$):** Novice students routinely confuse the thermodynamic tendency of a lipophilic drug to enter the membrane ($K$) with its kinetic speed of motion through the viscous lipid acyl chains ($D_{\text{mem}}$).
3. **The "Infinite Dilution" Fallacy in Drug Formulation:** Textbook problems typically assume ideal dilute conditions where permeation flux scales linearly with donor concentration ($J \propto C_0$). However, modern oral formulations of poorly water-soluble drugs (BCS Class II and IV) operate in supersaturated states. Above the solubility limit ($C_{\text{sat}}$), excess drug nucleates into crystalline precipitates, creating a flux plateau and depositing a physical cake layer on the membrane surface that reduces permeability [4, 5].
4. **Ignoring Multi-Solute & Excipient Interactions:** In clinical formulations, drugs are co-administered with permeation enhancers, surfactants, or secondary active ingredients. Standard teaching tools lack the ability to model competitive steric crowding or cooperative co-transport between two solutes simultaneously.

To overcome these barriers without requiring expensive software licenses, command-line coding, or lengthy molecular dynamics simulations, we developed **2D-Permeability-Simulator**.

---

## 2. Software Architecture & Design Principles

The simulator is built with modern, standard web technologies (HTML5, Canvas API, ES6 JavaScript, and CSS3) and runs entirely client-side in any contemporary web browser (Chrome, Firefox, Safari, Edge) without plugins, backend servers, or user registration.

### 2.1 Dual-Solute Modeling & Real-Time Visualization
The primary viewport (800 × 240 pixels) provides three switchable visual modes:
- **Macro Heatmap:** Continuous 2D scalar concentration fields with real-time marching isolines and composite RGB overlays for dual-solute tracking (Solute A in blue, Solute B in red).
- **Micro Bilayer View:** Procedurally generated lipid bilayers showing hydrophilic headgroups and dynamic acyl chain fluctuations that respond to user-adjusted lipid order parameters ($S$) and membrane fluidity ($\eta$).
- **Dual Solute Mode:** Side-by-side or combined inspection of two solutes with distinct molecular weights, partition coefficients, shapes, and solubility thresholds.

### 2.2 Dedicated Educational Minisimulators
Recognizing that students frequently struggle to untangle the roles of $K$ and $D$, the platform incorporates two isolated didactic minisimulators located directly beneath the primary simulation canvas:
1. **Partition Coefficient ($K / \log P$) Minisimulator:** Displays a two-phase aqueous/membrane micro-chamber where individual particles undergo stochastic thermal motion and cross the phase boundary according to Boltzmann transition probabilities:
   $$P_{\text{water}\to\text{lipid}} \propto \sqrt{K}, \qquad P_{\text{lipid}\to\text{water}} \propto \frac{1}{\sqrt{K}}$$
   Students directly observe how thermodynamic equilibrium ($N_{\text{lipid}} / N_{\text{water}} = K_{\text{obs}}$) emerges from microscopic boundary kinetics.
2. **Diffusion Coefficient ($D$) & Stokes-Einstein Minisimulator:** Demonstrates 2D Brownian random walks in media of variable viscosity (water, $\eta = 0.69\text{ cP}$; olive oil, $\eta = 40\text{ cP}$; and lipid core, $\eta = 90\text{ cP}$). Students can trigger a **"💧 Pulse Drop"** to track the spreading of a concentration pulse and verify the mean squared displacement relationship $\langle r^2 \rangle = 4Dt$.
3. **Overton Synthesis Module:** An interactive panel uniting the parameters via $P = \frac{K \cdot D_{\text{mem}}}{d}$ and lag time $\tau_{\text{lag}} = \frac{d^2}{6 D_{\text{mem}}}$, with a one-click button to push experimental values directly into the main 2D simulation engine.

---

## 3. Mathematical & Physical Formulation

### 3.1 Chemical Potential Formulation
To ensure rigorous mass conservation and prevent numerical singularities at phase boundaries, the 2D Fickian diffusion PDE is solved using continuous chemical potential $u(x, y, t)$:

$$\frac{\partial C_{\text{free}}(x, y, t)}{\partial t} = \nabla \cdot \left( \hat{D}(x, y) \, \nabla u(x, y, t) \right)$$

where $u = C_{\text{free}}$ in aqueous reservoirs and $u = C_{\text{free}} / K$ inside the lipid core. Spatial discretization uses a 2-way Gauss-Seidel relaxation solver with harmonic interface diffusivities:

$$D_{\text{interface}} = \frac{2 D_1 D_2}{D_1 + D_2}$$

### 3.2 Hydrodynamic Friction & Perrin Ellipsoid Shape Factors
Molecular geometry governs the Stokes-Einstein hydrodynamic radius $r_h$ through equivalent spherical radius $R_{\text{eq}}$ and Perrin shape factor $f_{\text{shape}}$ [6]:

$$R_{\text{eq}} = 0.066 \cdot (MW)^{1/3} \quad [\text{nm}], \qquad r_h = R_{\text{eq}} \cdot f_{\text{shape}} \cdot (1 + 0.18 \cdot \text{Hydration})$$

where:
- **Spheres ($p = 1.0$):** $f_{\text{shape}} = 1.0$
- **Prolate Rods ($p = a/b > 1$):** $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{1/3} \ln\left(p + \sqrt{p^2 - 1}\right)}$
- **Oblate Discs ($p = a/b > 1$):** $f_{\text{shape}} = \frac{\sqrt{p^2 - 1}}{p^{2/3} \arctan\left(\sqrt{p^2 - 1}\right)}$

### 3.3 Arrhenius Thermal Activation
Temperature scaling from reference room temperature ($T_0 = 298.15\text{ K}$) to physiological body temperature ($T = 310.15\text{ K}$, $37^\circ\text{C}$) follows:

$$D_{\text{wat}}(T) = D_0 \cdot \exp\left(-\frac{E_a}{R T} + \frac{E_a}{R T_0}\right) \quad \text{with } \frac{E_a}{R} \approx 2180\text{ K}$$

### 3.4 Solubility Limits, Crystallization, and Cake Resistance
In the **Crystallization Regime**, local concentration exceeding solubility ($C_{\text{free}} > C_{\text{sat}}$) triggers reversible precipitation:

$$\frac{\partial C_{\text{precip}}}{\partial t} = k_{\text{cryst}} \cdot \max\left(0, \frac{C_{\text{free}} - C_{\text{sat}}}{C_{\text{sat}}}\right) - k_{\text{dissol}} \cdot C_{\text{precip}}$$

Precipitated crystals depositing at the membrane surface form a physical cake layer that increases barrier resistance:

$$P_{\text{eff}} = \frac{P_0}{1 + r_{\text{cake}} \cdot \bar{C}_{\text{precip, surface}}}$$

---

## 4. Suggested Curriculum Integration & Laboratory Modules

The simulator is designed for flexible delivery in lecture demonstrations, flipped classrooms, and dedicated 2-hour laboratory sessions in **Biopharmaceutics**, **Physical Pharmacy**, or **Pharmacokinetics**. We provide four structured inquiry modules:

- **Module 1: Dissecting Overton's Rule (Thermodynamics vs. Kinetics):** Students use the $K$ and $D$ minisimulators to observe how lipophilic drugs (e.g., Ibuprofen, $K = 3.05$) achieve high partition into the membrane but experience slower diffusion due to hydrocarbon core viscosity.
- **Module 2: Membrane Fluidity, Lipid Order, and Permeation Lag Time:** Students manipulate lipid order ($S = 0.60$ for fluid POPC vs. $S = 0.90$ for rigid gel DPPC) and calculate permeation lag times ($\tau_{\text{lag}} = d^2 / [6 D_{\text{mem}}]$), illustrating the difference between fluid mucosal membranes and rigid epidermal strata.
- **Module 3: Formulation Science & The "Spring-and-Parachute" Effect:** Students model a supersaturated BCS Class II drug formulation ($C_0 = 3.0\text{ mM}, C_{\text{sat}} = 1.0\text{ mM}$). They observe the initial flux burst ("spring") followed by crystal precipitation, surface cake fouling, and the resulting flux plateau ("parachute").
- **Module 4: Dual-Solute Transport & Excipient Co-Transport:** Students evaluate how permeation enhancers or co-solutes modulate drug delivery via the Flory-Huggins interaction parameter $\chi_{AB}$.

---

## 5. Learning Objectives (Bloom's Taxonomy)

Upon completing the simulation exercises, pharmacy students will be able to:
1. **Differentiate** between thermodynamic affinity ($K$) and kinetic mobility ($D$) in biological membrane permeation (*Analysis*).
2. **Explain** how continuous chemical potential reconciles phase-boundary concentration jumps without violating mass conservation (*Comprehension*).
3. **Predict** the impact of molecular shape (Perrin factor), temperature, and membrane phase state (gel vs. fluid) on permeation lag time (*Application*).
4. **Evaluate** why supersaturated drug formulations deviate from linear Fickian flux and suffer from membrane surface fouling (*Evaluation*).
5. **Formulate** dosage design strategies that balance drug supersaturation against crystallization risks (*Synthesis*).

---

## 6. Conclusion & Educational Availability

**2D-Permeability-Simulator** transforms abstract, equation-heavy biopharmaceutics concepts into an engaging, visual, and mathematically rigorous learning experience. By enabling pharmacy students to interactively test hypotheses, isolate variables through dedicated minisimulators, and observe non-ideal formulation kinetics in real time, the platform strengthens conceptual mastery of transcellular drug transport.

The simulator is open-source (MIT License) and freely available at:  
- **Live Application:** https://karelberka.github.io/2D-permeability-simulator/  
- **Source Code Repository:** https://github.com/KarelBerka/2D-permeability-simulator  

---

## References

1. Shargel, L.; Yu, A. B. C. *Applied Biopharmaceutics & Pharmacokinetics*, 7th ed.; McGraw-Hill Education: New York, 2016.
2. Amidon, G. L.; Lennernäs, H.; Shah, V. P.; Crison, J. R. A Theoretical Basis for a Biopharmaceutic Drug Classification: The Correlation of in Vitro Drug Product Dissolution and in Vivo Bioavailability. *Pharm. Res.* **1995**, *12* (3), 413–420. DOI: 10.1023/a:1016212804288.
3. Overton, C. E. Ueber die allgemeinen osmotischen Eigenschaften der Zelle, ihre vermuthlichen Ursachen und ihre Bedeutung für die Physiologie. *Vierteljahrsschr. Naturforsch. Ges. Zürich* **1899**, *44*, 88–135.
4. Brouwers, J.; Brewster, M. E.; Augustijns, P. Supersaturating Drug Delivery Systems: The Answer to Soluble Challenges? *J. Pharm. Sci.* **2009**, *98* (8), 2549–2572. DOI: 10.1002/jps.21650.
5. Guzman, H. R.; Tawa, M.; Zhang, Z.; Ratanabanangkoon, P.; Shaw, P.; Gardner, C. R.; Chen, H.; Moreau, J. P.; Almarsson, Ö. Combined Use of Crystalline Salt Forms and Precipitation Inhibitors to Improve Oral Absorption of Celecoxib from Solid Dosage Forms. *J. Pharm. Sci.* **2007**, *96* (10), 2686–2702. DOI: 10.1002/jps.20906.
6. Perrin, F. Mouvement brownien d'un ellipsoïde (II). Rotation libre et dépolarisation des fluorescences. Translation et diffusion de molécules ellipsoïdales. *J. Phys. Radium* **1936**, *7* (1), 1–11. DOI: 10.1051/jphysrad:01936007010100.
