# Student Activity Worksheet: Exploring Non-Equilibrium Membrane Permeability, Dual-Solute Interactions, and Crystallization Kinetics

**Course:** Physical Chemistry / Biophysical Chemistry / Pharmacokinetics  
**Name:** ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Date:** ___________________ &nbsp;&nbsp;&nbsp;&nbsp; **Partner:** ___________________  
**Simulation Access:** https://karelberka.github.io/2D-permeability-simulator/ (or `http://localhost:8080`)

---

## 🎯 Learning Goals
By completing this laboratory activity, you will be able to:
1. Explain how continuous chemical potential gradients drive mass transport across lipid-water boundaries, creating concentration jumps governed by Overton's partition coefficient ($K$).
2. Predict how molecular size, geometry (Perrin shape factor $f_{\text{shape}}$), and temperature alter diffusion coefficients ($D_{\text{wat}}$, $D_{\text{mem}}$) and lag times ($\tau_{\text{lag}}$).
3. Investigate the difference between ideal **Infinite Dilution** and real **Crystallization & Membrane Fouling** regimes.
4. Analyze how cross-solute interaction parameters ($\chi_{AB}$) influence multi-component permeation.

---

## 🧪 Activity 1: Overton's Rule, Partition Jumps, and Membrane Structure

### 1.1 Lipophilicity and Equilibrium Partitioning
1. Open the simulator and select the **Default (Passive Transcellular Diffusion)** preset.
2. In the top toolbar, ensure **💧 Infinite Dilution** mode is selected.
3. Observe **Solute A (Blue, Ibuprofen, $K_A = 3.05$)** and **Solute B (Red, Caffeine, $K_B = 0.15$)**.
4. Run the simulation for $10\text{ s}$. Look at the **1D Concentration Profile $C(x)$** in the bottom left chart.

**Questions:**
- **Q1.1 (Prediction vs. Observation):** What happens to the concentration of Solute A inside the membrane slab compared to the aqueous donor chamber? Why does Solute A show a concentration peak inside the membrane, while Solute B shows a concentration dip?
  > *Your Answer:*

- **Q1.2:** Does this sudden concentration jump mean mass is being created or that Fick’s law is violated? Explain how the continuous chemical potential $u(x,y)$ reconciles this observation.
  > *Your Answer:*

---

### 1.2 Membrane Fluidity and Order Parameter ($S$)
1. In the sidebar under **Membrane Structural Properties**, locate the **Lipid Order Parameter ($S$)** and **Membrane Fluidity ($\eta$)** sliders.
2. Switch the view mode in the top toolbar to **Micro Bilayer & Solutes**.
3. Fill in the data table below by recording the calculated metrics from the sidebar table:

| Scenario | Lipid Preset | Order $S$ | Fluidity $\eta$ | Solute A $D_{\text{mem}}$ ($\text{cm}^2/\text{s}$) | Solute A Permeability $P$ ($\text{cm/s}$) | Lag Time $\tau_{\text{lag}}$ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | POPC (Fluid $L_\alpha$) | 0.60 | 0.55 | | | |
| **B** | DPPC (Gel $L_\beta$) | 0.90 | 0.15 | | | |
| **C** | POPC + Chol ($L_o$) | 0.80 | 0.40 | | | |

- **Q1.3:** How does an increase in lipid ordering ($S \to 0.90$) impact the physical lag time $\tau_{\text{lag}}$ and overall permeability $P$? Relate this to drug absorption through rigid vs. fluid membranes.
  > *Your Answer:*

---

## 🧪 Activity 2: Hydrodynamic Radius, Molecular Shape, and Temperature

1. Reset the simulation.
2. In the **Solute A (Blue)** tab, change the **Solute A Preset** and observe the calculated Hydrodynamic Radius ($r_h$) and Permeability ($P$):

| Molecule | Molecular Weight ($MW$) | Shape | Aspect Ratio ($p$) | $r_h$ (nm) | $D_{\text{wat}}$ ($\text{cm}^2/\text{s}$) | Effective $P$ ($\text{cm/s}$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Water | 18 Da | Sphere | 1.0 | | | |
| Ibuprofen | 206 Da | Disc | 2.4 | | | |
| Macrocycle | 1000 Da | Disc | 3.0 | | | |

- **Q2.1:** Why does a planar disc-shaped molecule (like Ibuprofen) experience a different hydrodynamic friction than a spherical molecule of the exact same molecular weight?
  > *Your Answer:*

- **Q2.2 (Temperature Effect):** Increase the temperature slider from $25.0^\circ\text{C}$ to $37.0^\circ\text{C}$ to $45.0^\circ\text{C}$. Record the changes in $D_{\text{wat}}$ and $P$. Explain how the Arrhenius equation models this thermal activation.
  > *Your Answer:*

---

## 🧪 Activity 3: Concentration Limits, Supersaturation, and the "Spring-and-Parachute" Effect

1. Reset the simulation.
2. Switch the top regime toggle to **💎 Crystallization**.
3. In the **Solute A** panel, set:
   - Initial Donor Concentration $C_{A0} = 3.0\text{ mM}$
   - Solubility Limit $C_{\text{sat}, A} = 1.00\text{ mM}$
   - Crystallization Rate $k_{\text{cryst}} = 0.20\text{ s}^{-1}$
   - Membrane Fouling Resistance $r_{\text{cake}} = 1.00$
4. Press **Play** and watch both the **2D Simulation Canvas** and the **1D Concentration Profile $C(x)$**.

**Observations:**
- **Q3.1:** What happens in the donor chamber during the first $5\text{ seconds}$? Describe what the sparkling micro-crystals on the canvas and the shaded area in the 1D chart represent.
  > *Your Answer:*

- **Q3.2 (Spring & Parachute Effect):** Look at the **Receiver Accumulation $J(t)$** chart on the bottom right. Why does the permeation curve rise rapidly at early times before slowing down to a plateau? How does the formation of a **Cake Layer** on the membrane wall contribute to this slowdown?
  > *Your Answer:*

- **Q3.3 (Comparative Analysis):** Toggle between **💧 Infinite Dilution** and **💎 Crystallization**. Summarize why assuming infinite dilution can lead to a dangerous overestimation of drug permeation in pharmaceutical formulations.
  > *Your Answer:*

---

## 🧪 Activity 4: Multi-Solute Mixtures and Competitive Cross-Interactions ($\chi_{AB}$)

1. Set the view mode to **Dual Solute Mode (Blue & Red)**.
2. In the **Interactions** tab, set the Cross-Solute Interaction parameter $\chi_{AB} = +0.80$ (**Steric Crowding / Repulsion**).
3. Set initial concentrations: $C_{A0} = 2.0\text{ mM}$ and $C_{B0} = 2.0\text{ mM}$.
4. Run the simulation for $15\text{ s}$.

**Questions:**
- **Q4.1:** How does high concentration of Solute B affect the transport and effective diffusion of Solute A in the mixture?
  > *Your Answer:*

- **Q4.2:** Change $\chi_{AB}$ to $-0.60$ (**Attraction / Co-Transport**). Describe how cooperative transport alters the receiver accumulation rate.
  > *Your Answer:*

---

## 📝 Synthesis and Summary Question
In your own words, summarize how the 2D Permeability Simulator bridges macroscopic parameters ($P, K, d$) with microscopic biophysical realities (steric crowding, lipid ordering, crystallization, and membrane caking).
> *Your Synthesis:*
