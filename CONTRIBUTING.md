# Contributing to 2D-Permeability-Simulator

Thank you for your interest in contributing to the **2D-Permeability-Simulator**! We welcome contributions, feature requests, bug reports, and pedagogical worksheets from researchers, software developers, and educators.

## Code of Conduct

This project adheres to the Contributor Covenant Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.

## How to Contribute

### 1. Reporting Bugs & Issues
- Check existing GitHub Issues to see if your bug or question has already been reported.
- If not, open a new Issue providing:
  - Clear descriptive title
  - Steps to reproduce
  - Expected vs. actual behavior
  - Browser version and operating system

### 2. Suggesting Enhancements & Educational Modules
- We warmly welcome didactic scenarios, new drug/solute presets, and suggestions for laboratory exercises.
- Open a GitHub Issue tagged as `enhancement` or `education` to propose your ideas.

### 3. Submitting Pull Requests (PR)
1. Fork the repository and create your feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Verify all existing tests pass:
   ```bash
   node tests/physics.test.js
   ```
3. Ensure strict syntax and formatting:
   ```bash
   node -c js/*.js
   ```
4. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(physics): add new solute preset for atorvastatin"
   ```
5. Push to your branch and open a Pull Request against `main`.

## Development Setup

The application is lightweight and runs entirely client-side with zero external build tools required:
- Simply serve the root directory using any local HTTP server:
  ```bash
  python -m http.server 8080
  # or
  npx serve .
  ```
- Open `http://localhost:8080` in your web browser.

## Questions & Contact

For inquiries regarding didactic implementation, academic collaboration, or classroom trials, please contact:
- **Karel Berka**: `karel.berka@upol.cz`
