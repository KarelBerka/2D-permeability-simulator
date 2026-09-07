# Instructor Guide & Solution Key: 2D Membrane Permeability Simulator

**Target Courses:** Physical Chemistry, Biophysical Chemistry, Chemical Biology, Pharmacokinetics / Drug Delivery  
**Prerequisites:** Basic concepts of diffusion (Fick's 1st & 2nd laws), chemical potential, and lipid bilayer structure.  
**Estimated Time:** 60–90 minutes (can be split across lecture demonstrations or a dedicated computer lab session).

---

## 👨‍🏫 Instructor Overview & Pedagogical Strategy

This platform replaces abstract mathematical derivations with real-time computational visualization. The exercises are structured using the **Predict–Observe–Explain (POE)** learning cycle.

### Common Student Misconceptions Addressed:
1. **Misconception:** *"Concentration must be continuous across all interfaces."*  
   **Correction:** Chemical potential ($u$) is continuous at thermodynamic equilibrium, but concentration ($C$) exhibits a step-function jump determined by the partition coefficient ($C_{\text{mem}} = K \cdot C_{\text{wat}}$).
2. **Misconception:** *"Doubling donor concentration will always double the steady-state permeation flux."*  
   **Correction:** Above the solubility limit ($C_{\text{sat}}$), excess solute precipitates into immobile crystals. Only free dissolved monomers possess thermodynamic activity driving permeation, causing flux to plateau.
3. **Misconception:** *"Solute diffusion inside a membrane is just a scaled constant."*  
   **Correction:** Intra-membrane diffusion is governed by lipid acyl chain packing (order parameter $S$), membrane fluidity $\eta$, molecular shape (Perrin friction), and surface cake layer accumulation.

---

## 🔑 Complete Solution Key to Student Activities

### Activity 1: Overton's Rule, Partition Jumps, and Membrane Structure

- **Q1.1 (Partition Jump):**  
  *Expected Student Response:* Solute A has a partition coefficient $K_A = 3.05 > 1$ (lipophilic), meaning it is thermodynamically favored inside the hydrocarbon interior of the membrane relative to water, resulting in $C_{\text{mem}} = 3.05 \cdot C_{\text{wat}}$ and a concentration peak. Conversely, Solute B ($K_B = 0.15 < 1$, hydrophilic) is disfavored in the hydrophobic core, creating a concentration dip.
- **Q1.2 (Chemical Potential Continuity):**  
  *Expected Student Response:* No mass is created. While concentration $C(x,y)$ has a step jump, the chemical potential $u(x,y) = C/K$ is smooth and continuous across the boundary. Fick's law operates on the gradient of chemical potential ($\nabla u$), ensuring mass conservation.
- **Table 1.1 Sample Values:**
  - *POPC ($S=0.60, \eta=0.55$):* $D_{\text{mem}} \approx 1.65 \times 10^{-10}\text{ cm}^2/\text{s}$, $P \approx 4.40 \times 10^{-4}\text{ cm/s}$, $\tau_{\text{lag}} \approx 20.5\text{ s}$
  - *DPPC Gel ($S=0.90, \eta=0.15$):* $D_{\text{mem}} \approx 1.25 \times 10^{-11}\text{ cm}^2/\text{s}$, $P \approx 3.35 \times 10^{-5}\text{ cm/s}$, $\tau_{\text{lag}} \approx 270.0\text{ s}$
  - *POPC + Chol ($S=0.80, \eta=0.40$):* $D_{\text{mem}} \approx 5.80 \times 10^{-11}\text{ cm}^2/\text{s}$, $P \approx 1.55 \times 10^{-4}\text{ cm/s}$, $\tau_{\text{lag}} \approx 58.3\text{ s}$
- **Q1.3 (Order & Lag Time):**  
  *Expected Student Response:* Increasing lipid ordering ($S \to 0.90$) drastically reduces free volume between acyl chains. This decreases $D_{\text{mem}}$ by over an order of magnitude and increases the lag time $\tau_{\text{lag}} = d^2 / (6 D_{\text{mem}})$ from $\sim 20\text{ s}$ to $\sim 270\text{ s}$. Rigid gel membranes form strong physical barriers to drug permeation.

---

### Activity 2: Hydrodynamic Radius, Molecular Shape, and Temperature

- **Table 2.1 Sample Values:**
  - *Water ($18\text{ Da}$, Sphere, $p=1.0$):* $r_h \approx 0.15\text{ nm}$, $D_{\text{wat}} \approx 1.05 \times 10^{-5}\text{ cm}^2/\text{s}$
  - *Ibuprofen ($206\text{ Da}$, Disc, $p=2.4$):* $r_h \approx 0.45\text{ nm}$, $D_{\text{wat}} \approx 9.87 \times 10^{-6}\text{ cm}^2/\text{s}$, $P \approx 4.40 \times 10^{-4}\text{ cm/s}$
  - *Macrocycle ($1000\text{ Da}$, Disc, $p=3.0$):* $r_h \approx 1.20\text{ nm}$, $D_{\text{wat}} \approx 3.75 \times 10^{-6}\text{ cm}^2/\text{s}$, $P \approx 8.50 \times 10^{-6}\text{ cm/s}$
- **Q2.1 (Perrin Friction):**  
  *Expected Student Response:* A non-spherical oblate disc or prolate rod sweeps out a larger rotational and translational solvent volume than a compact sphere, creating greater drag and higher effective hydrodynamic radius ($r_h = R_{\text{eq}} \cdot f_{\text{shape}}$), which reduces diffusivity according to the Stokes-Einstein relation.
- **Q2.2 (Arrhenius Scaling):**  
  *Expected Student Response:* Increasing temperature from $25^\circ\text{C}$ ($298\text{ K}$) to $37^\circ\text{C}$ ($310\text{ K}$) accelerates kinetic thermal energy. Diffusivity increases by $\sim 30\%$ according to $D(T) = D_0 \exp(-E_a/RT + E_a/RT_0)$, directly boosting the overall permeation rate across biological membranes at physiological body temperature.

---

### Activity 3: Concentration Limits, Supersaturation, and the "Spring-and-Parachute" Effect

- **Q3.1 (Precipitation Dynamics):**  
  *Expected Student Response:* Because $C_{A0} = 3.0\text{ mM} > C_{\text{sat}} = 1.0\text{ mM}$, the donor compartment is supersaturated. Excess solute nucleates into crystalline precipitates ($C_{\text{precip}}$), shown as sparkling micro-crystal polygons on the canvas and shaded solid fractions above $C_{\text{free}}$ in the 1D profile. The dissolved active monomer concentration $C_{\text{free}}$ relaxes down to the solubility ceiling $C_{\text{sat}} = 1.0\text{ mM}$.
- **Q3.2 (Spring & Parachute Effect & Cake Layer):**  
  *Expected Student Response:* Initially, the high supersaturated concentration ($3.0\text{ mM}$) creates a steep initial chemical potential gradient, causing a rapid initial flux ("spring"). However, as crystals precipitate and deposit on the membrane wall, they form a solid **Cake Layer (Surface Fouling)**. This cake layer adds boundary resistance ($R_{\text{cake}} = r_{\text{cake}} \cdot C_{\text{precip}}$), reducing effective permeability ($P_{\text{eff}} = P_0 / [1 + r_{\text{cake}} C_{\text{precip}}]$) and causing the receiver concentration $J(t)$ to transition into a sustained plateau ("parachute").
- **Q3.3 (Dangers of Infinite Dilution Assumptions):**  
  *Expected Student Response:* Assuming infinite dilution implies $J \propto C_0$, predicting that higher drug dosage always yields proportionally faster delivery. In reality, insoluble drugs precipitate, form crusts, and saturate transport, meaning excess drug provides zero additional absorption while risking local toxicity.

---

### Activity 4: Multi-Solute Mixtures and Competitive Cross-Interactions ($\chi_{AB}$)

- **Q4.1 (Steric Crowding, $\chi_{AB} > 0$):**  
  *Expected Student Response:* High concentration of Solute B occupies local volume in reservoirs and membrane interfaces, creating steric hindrance that slows down the diffusion and permeation of Solute A ($D_{A, \text{eff}} = D_A / [1 + 0.25 \chi_{AB} C_B]$).
- **Q4.2 (Cooperative Transport, $\chi_{AB} < 0$):**  
  *Expected Student Response:* Attractive interactions or co-solute facilitation enhance mobility, accelerating the transport of both solutes across the membrane.

---

## 📊 Suggested Grading Rubric (100 Points Total)

| Criteria | Points | Excellent (90–100%) | Adequate (70–89%) | Needs Improvement (<70%) |
| :--- | :--- | :--- | :--- | :--- |
| **Activity 1: Partitioning & Fluidity** | 25 pts | Correctly distinguishes $C$ jumps from continuous $u$; accurately fills Table 1.1 with correct lag time trends. | Minor numerical omissions in Table 1.1; explanation of $u$ is partially complete. | Fails to explain chemical potential continuity; incomplete table. |
| **Activity 2: Shape & Temperature** | 20 pts | Correctly applies Perrin factor and Arrhenius scaling equations to explain molecular friction. | Understands temperature trends but confuses Perrin shape factor definitions. | Missing calculations; qualitative errors. |
| **Activity 3: Crystallization & Caking** | 30 pts | Thoroughly explains supersaturation, phase separation, cake resistance, and the spring-and-parachute effect. | Identifies precipitation but fails to link surface cake resistance to flux plateauing. | Confuses dissolved monomers with precipitates; incomplete answers. |
| **Activity 4: Multi-Solute Cross Coupling** | 15 pts | Correctly explains steric crowding ($\chi > 0$) vs. co-transport ($\chi < 0$) using Flory-Huggins principles. | Describes effects qualitatively without referencing interaction parameters. | Incomplete answers. |
| **Synthesis & Clarity** | 10 pts | Clear, rigorous scientific writing uniting continuum and microscopic views. | Generally coherent with minor conceptual gaps. | Disorganized or superficial summary. |
