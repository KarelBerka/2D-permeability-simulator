# Student Laboratory Worksheet: Biopharmaceutics & Membrane Permeability

**Course:** Biopharmaceutics / Physical Pharmacy / Pharmacokinetics / Biophysical Chemistry  
**Student Name:** ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Date:** ___________________  
**Simulation URL:** https://karelberka.github.io/2D-permeability-simulator/ (or local `http://localhost:8080`)  

---

## 🎯 Learning Objectives
By completing this virtual laboratory activity, you will be able to:
1. Distinguish between thermodynamic affinity ($K$) and kinetic mobility ($D$) in transcellular drug transport.
2. Explain how continuous chemical potential reconciles phase-boundary concentration jumps without violating mass conservation.
3. Investigate how molecular size, geometry (Perrin shape factor), temperature, and membrane fluidity affect permeation lag time ($\tau_{\text{lag}}$).
4. Evaluate why supersaturated drug formulations (BCS Class II) deviate from ideal linear Fickian flux and suffer from membrane surface fouling (*cake layer resistance*).
5. Analyze multi-solute interactions ($\chi_{AB}$) modeling drug-excipient or drug-enhancer co-transport.

---

## 🧪 Part 1: Isolating the Fundamentals — Partitioning ($K$) vs. Diffusion ($D$)

Scroll down below the main simulation canvas to the **🔬 Educational Minisimulators: Fundamental Permeability Determinants** section.

### 1.1 Minisimulator 1: Partition Coefficient ($K / \log P$)
1. Examine the two chambers: **💧 Aqueous Phase (Water)** on the left and **🛡️ Lipid Phase (Membrane)** on the right.
2. Under **Preset Molecules**, click on **Hydrophilic Ion ($K = 0.05$)**. Press **Play** and observe for 15 seconds.
3. Next, click on **Lipophilic Steroid ($K = 15.0$)**. Observe the particle distribution.

**Questions:**
- **Q1.1:** How does the number of particles in the lipid phase change when switching from the Hydrophilic Ion to the Lipophilic Steroid? Record the measured partition ratio ($K_{\text{obs}} = N_{\text{lipid}} / N_{\text{water}}$):
  - *Hydrophilic Ion:* $K_{\text{obs}} =$ ________
  - *Lipophilic Steroid:* $K_{\text{obs}} =$ ________
- **Q1.2:** In your own words, explain how thermal motion and crossing probabilities produce a stable macroscopic partition equilibrium without any active "pumping" force.
  > *Your Explanation:*

---

### 1.2 Minisimulator 2: Diffusion Coefficient ($D$) & Stokes-Einstein Walk
1. In the second minisimulator, examine the Brownian motion of particles.
2. Click the **💧 Pulse Drop** button to place all particles at a single central point.
3. Observe how the pulse expands radially according to the 2D diffusion equation $\langle r^2 \rangle = 4Dt$.
4. Switch the **Diffusion Medium** between **Water ($\eta = 0.69\text{ cP}$)**, **Olive oil ($\eta = 40\text{ cP}$)**, and **Lipid core ($\eta = 90\text{ cP}$)**.

**Questions:**
- **Q1.3:** Record the calculated diffusion coefficient $D$ for each medium:
  - *Water:* $D =$ ________________ $\text{cm}^2/\text{s}$
  - *Olive Oil:* $D =$ ________________ $\text{cm}^2/\text{s}$
  - *Lipid Core:* $D =$ ________________ $\text{cm}^2/\text{s}$
- **Q1.4:** Why is drug diffusion through the lipid bilayer core orders of magnitude slower than diffusion through the surrounding aqueous cytoplasm or intestinal lumen?
  > *Your Explanation:*

---

## 🧪 Part 2: Transcellular Permeation & Overton's Rule

Return to the top **2D Simulation Canvas**.
1. In the toolbar, ensure **💧 Infinite Dilution Mode** is selected.
2. Click **Reset**, then press **Play**.
3. Observe the **Donor Chamber**, **Lipid Membrane**, and **Receiver Chamber**.
4. Examine the **1D Concentration Profile $C(x)$** chart (bottom-left).

**Questions:**
- **Q2.1 (The Concentration Jump Paradox):** In the 1D chart, Solute A (Blue, Ibuprofen, $K = 3.05$) exhibits a steep concentration peak inside the membrane, whereas Solute B (Red, Caffeine, $K = 0.15$) exhibits a deep concentration dip. Does this sharp jump at the boundary violate Fick’s law or create infinite mass flux? Explain how the continuous chemical potential ($u = C / K$) resolves this paradox.
  > *Your Explanation:*

- **Q2.2 (Membrane Fluidity & Lag Time):** In the right sidebar under **Membrane Structural Properties**, change the lipid preset from **POPC (Fluid)** to **DPPC (Gel)**. Record the values from the metrics table:

| Lipid Phase | Lipid Order $S$ | Membrane Fluidity $\eta$ | Permeability $P$ ($\text{cm/s}$) | Physical Lag Time $\tau_{\text{lag}}$ |
| :--- | :--- | :--- | :--- | :--- |
| **POPC (Fluid $L_\alpha$)** | 0.60 | 0.55 | | |
| **DPPC (Rigid Gel $L_\beta$)** | 0.90 | 0.15 | | |

- **Q2.3:** Why do rigid, ordered lipid membranes (such as the *stratum corneum* of the skin) exhibit significantly longer lag times ($\tau_{\text{lag}}$) before steady drug delivery is achieved?
  > *Your Explanation:*

---

## 🧪 Part 3: Formulation Science — Supersaturation, Precipitation, and Membrane Caking

1. In the top toolbar, toggle the mode to **💎 Crystallization**.
2. In the **Solute A** panel, configure a supersaturated formulation representing a poorly soluble BCS Class II drug:
   - Initial Donor Concentration $C_{A0} = 3.0\text{ mM}$
   - Solubility Limit $C_{\text{sat}, A} = 1.00\text{ mM}$
   - Crystallization Rate $k_{\text{cryst}} = 0.25\text{ s}^{-1}$
   - Membrane Fouling Resistance $r_{\text{cake}} = 0.80$
3. Press **Play** and observe both the **2D Simulation Canvas** and the **Permeation Accumulation $J(t)$** chart.

**Questions:**
- **Q3.1 (Spring-and-Parachute Effect):** Look at the accumulation curve $J(t)$ in the receiver chamber. Why does the permeation flux rise very rapidly at early times before slowing down into a sustained plateau?
  > *Your Explanation:*

- **Q3.2 (Membrane Cake Layer Resistance):** Observe the sparkling micro-crystals on the 2D canvas and the indicator badge `"Cake Layer Formed"` on the chamber bar. How does crystal precipitation at the donor-membrane interface create an additional diffusion barrier ($P_{\text{eff}} = P_0 / [1 + r_{\text{cake}} C_{\text{precip}}]$)?
  > *Your Explanation:*

- **Q3.3 (Clinical / Formulation Relevance):** Why can assuming "Infinite Dilution" in pharmacokinetic modeling lead to dangerous overestimates of drug absorption for poorly water-soluble oral drugs?
  > *Your Explanation:*

---

## 🧪 Part 4: Dual-Solute Interactions & Excipient Co-Transport ($\chi_{AB}$)

1. Set the view mode to **Dual Solute Mode (Blue & Red)**.
2. In the **Interactions** tab, set the Cross-Solute Interaction parameter $\chi_{AB} = +0.80$ (**Steric Crowding / Competitive Repulsion**).
3. Set initial concentrations: $C_{A0} = 2.0\text{ mM}$ and $C_{B0} = 2.0\text{ mM}$. Run for 15 seconds.
4. Next, set $\chi_{AB} = -0.60$ (**Cooperative Co-Transport / Permeation Enhancer**).

**Questions:**
- **Q4.1:** How does the presence of high Solute B concentration with positive crowding ($\chi_{AB} > 0$) influence the effective diffusion and permeation of Solute A?
  > *Your Explanation:*

- **Q4.2:** In pharmaceutical formulation, why are permeation enhancers or co-solvents often added to topical or transdermal patches? Relate your answer to negative interaction parameter ($\chi_{AB} < 0$).
  > *Your Explanation:*

---

## 📝 Synthesis Question
Summarize how 2D-Permeability-Simulator demonstrates the trade-offs in formulating poorly water-soluble (BCS Class II) drugs: balancing lipophilic permeability ($K$), solubility limits ($C_{\text{sat}}$), and precipitation risks.
> *Your Synthesis:*
