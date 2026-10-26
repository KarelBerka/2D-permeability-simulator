# Comparative Journal Selection Guide: Where to Publish 2D-Permeability-Simulator

This guide provides a strategic analysis of publication venues for **2D-Permeability-Simulator**, comparing the **Journal of Open Source Software (JOSS)** with leading journals in **Pharmacy Education** and **Chemical/Biophysical Education**.

---

## Quick Comparison Matrix

| Journal | Publisher | Impact / Indexing | Focus & Article Type | Typical Length | Review Process & Speed | Recommended Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **JOSS** (*Journal of Open Source Software*) | Open Journals / NumFOCUS | Scopus, Web of Science, DOAJ | Research Software / Software Note | 1,000–1,500 words (`paper.md`) | Open GitHub review (2–6 weeks); very fast | **Fastest software DOI**. Establishes official citable codebase. |
| **AJPE** (*American Journal of Pharmaceutical Education*) | Elsevier / AACP | Clarivate IF ~2.5–3.0, PubMed, Scopus | Pharmacy Curricula, Biopharmaceutics Didactics (*Educational Tool* / *Instructional Design*) | 3,000–5,000 words + student materials | Traditional peer review (2–3 months) | **Top choice for Pharmacy Education**. Aligns with PharmD & BS Pharm curricula. |
| **CPTL** (*Currents in Pharmacy Teaching and Learning*) | Elsevier | PubMed, Scopus, ESCI | Practical classroom/lab simulations (*Teaching and Learning Note* / *Original Research*) | 3,000–4,000 words | Traditional peer review (2–3 months) | Excellent, highly receptive venue for active-learning laboratory modules. |
| **JCE** (*Journal of Chemical Education*) | ACS | Clarivate IF ~3.0, PubMed, Scopus | Physical & Biophysical Chemistry Education (*Technology Report* / *Activity*) | 2,500–4,500 words + extensive SI | Rigorous peer review (2–4 months) | **Premier venue if targeting broader chemistry/biophysics audiences**. |
| **BAMBEd** (*Biochemistry and Molecular Biology Education*) | Wiley / IUBMB | Clarivate IF ~1.6, PubMed, Scopus | Membrane biophysics, molecular transport (*Short Communication* / *Educational Paper*) | 2,500–4,000 words | Traditional peer review (2–3 months) | Strong focus on molecular mechanisms and lipid bilayer dynamics. |

---

## Detailed Profile of Target Journals

### 1. Journal of Open Source Software (JOSS)
- **Website:** https://joss.theoj.org/
- **Scope:** JOSS publishes short papers describing research and educational software. It does not judge novel scientific discoveries; instead, it evaluates software engineering quality, documentation, testing, and open-source practices.
- **Why It Fits 2D-Permeability-Simulator:**
  - The repository now contains all JOSS prerequisites: `LICENSE` (MIT), `CITATION.cff`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, an automated test suite (`tests/physics.test.js`), and `paper/paper.md` + `paper/paper.bib`.
  - The review is conducted transparently via an open GitHub issue where reviewers test the live web app and run unit tests.
- **Recommended Use:** Submit immediately to secure an official peer-reviewed software citation for the codebase.

---

### 2. American Journal of Pharmaceutical Education (AJPE)
- **Website:** https://www.ajpe.org/
- **Scope:** AJPE is the flagship journal of the American Association of Colleges of Pharmacy (AACP). It reaches pharmacy faculty worldwide.
- **Why It Fits 2D-Permeability-Simulator:**
  - Membrane transport and permeability are core competencies in **Biopharmaceutics**, **Pharmacokinetics**, and **Physical Pharmacy**.
  - The simulator addresses key pharmacy topics:
    - **Biopharmaceutics Classification System (BCS):** Comparing permeability vs. solubility (Class I to IV).
    - **Formulation Science & Supersaturation:** Simulating the pharmaceutical *"spring and parachute"* effect, drug precipitation, and membrane surface fouling (*cake layer resistance*).
    - **Excipient Co-transport:** Exploring how Solute B (excipient/enhancer) modulates Solute A (drug) transport via cross-interaction ($\chi_{AB}$).
    - **Educational Minisimulators:** Enabling pharmacy students to isolate partition coefficient ($K / \log P$) from diffusion ($D$).

---

### 3. Currents in Pharmacy Teaching and Learning (CPTL)
- **Website:** https://www.sciencedirect.com/journal/currents-in-pharmacy-teaching-and-learning
- **Scope:** Dedicated to pedagogical scholarship in pharmacy education, particularly innovative computer simulations, virtual laboratories, and active-learning exercises.
- **Why It Fits:**
  - Highly welcoming to web-based, zero-install virtual lab activities that can be integrated directly into remote, hybrid, or in-person pharmacy coursework without IT overhead.

---

### 4. Journal of Chemical Education (ACS - JCE)
- **Website:** https://pubs.acs.org/journal/jceda8
- **Scope:** The world's premier journal for chemical and physical sciences education.
- **Article Type:** *Technology Report* (describes software tools) or *Chemical Education Activity* (focuses on classroom exercises).
- **Requirements:** Requires the software tool plus detailed **Supporting Information** containing a student activity worksheet and instructor solution guide (which are prepared in this directory).

---

## 🏆 Recommended Dual-Publication Strategy

The most effective academic strategy is a **two-stage publication pipeline**:

1. **Stage 1 (Software Paper in JOSS):**
   - Submit the software note (`paper/paper.md`) to **JOSS**.
   - Gives the GitHub repository an official peer-reviewed citation (with DOI) in 3–6 weeks.
   
2. **Stage 2 (Educational Application Paper in AJPE or JCE):**
   - Submit the full pedagogical study (`education/PHARMACY_EDUCATION_MANUSCRIPT.md`) together with the student worksheet and instructor guide to **AJPE** (for pharmacy educators) or **JCE** (for physical/biophysical chemistry educators).
   - The educational manuscript directly cites the JOSS software paper, creating two high-impact publications from one project!
