# SightX: Diabetic Retinopathy Detection System

> **Preventing blindness through AI.** SightX is a clinical diagnostic platform that leverages deep learning to enable early screening for Diabetic Retinopathy.

---

## 🔬 The SightX Story
Diabetes is a global challenge, and Diabetic Retinopathy remains a leading cause of preventable blindness. For many, the first symptom is permanent vision loss. **SightX was built with a personal mission:** to bridge the gap between advanced medical AI and the patients who need it most, honoring a family journey with diabetes.

By combining a **ResNet-50 V2** backbone with Bayesian decision theory and a "No-Line" clinical UI, SightX provides a robust, safe, and beautiful screening experience.

---

## 🏗 System Architecture
SightX is built as a highly-decoupled microservices stack, ensuring scalability and clinical reliability.

| Component | Responsibility | Tech Stack | Documentation |
| :--- | :--- | :--- | :--- |
| **Frontend** | Clinical Interface & User Flow | React, MUI, Vite | [View README](./frontend/README.md) |
| **Backend** | API Orchestration & Gateway | Node.js, Express, Multer | [View README](./backend/README.md) |
| **Inference Engine** | ResNet AI & Clinical Post-processing | PyTorch, FastAPI, NumPy | [View README](./inference-engine/README.md) |

---

## 🌟 Technical Highlights
### 1. Clinical-Grade AI Safety
- **108-Iteration TTA Ensemble**: Robustness against camera artifacts using Test-Time Augmentation.
- **Bayesian Prior Correction**: Adjusts for training-set bias (EyePACS) to reflect real-world clinical prevalence.
- **Risk-Minimized Decisions**: Uses an asymmetric cost matrix to prioritize patient safety over raw accuracy.

### 2. Clinical UI
- **The "No-Line" Rule**: A design philosophy utilizing tonal layering and depth instead of harsh borders.
- **Clinical Aesthetics**: Glassmorphism and high-performance animations tailored for medical environments.

---

## 🚀 Quick Start (Orchestration)
The entire SightX stack is containerized for professional deployment.

1. **Environment Config**: Ensure your `.env` contains the required Supabase and AI engine tokens.
2. **Launch Stack**:
   ```bash
   docker-compose up --build
   ```
3. **Internal Access**:
   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:5001`
   - Inference Engine: `http://localhost:8000`

## 🩺 Clinical Operating Mandate

### 1. Optical Hardware Requirements
SightX is optimized for high-resolution retinal imaging. To ensure diagnostic accuracy, images **must** be captured using professional **Digital Fundus Cameras**:
- **Field of View (FOV)**: Minimum 45° horizontal (non-mydriatic preferred).
- **Resolution**: Minimum 30 pixels per degree (ppd).
- **Standards**: Images should ideally be DICOM-compliant with unique patient identifiers at the point of capture.
- **Environment**: Controlled lighting to minimize artifacts and lens flare.

### 2. Governance & Data Sovereignty
SightX is designed for institutional deployment and adheres to strict clinical governance:
- **Environment**: Must operate exclusively within **Hospital/Clinical Environments** under direct supervision of medical authorities.
- **User Roles**: Intended for use by **Verified Clinicians** and **Medical Residents**.
- **Regulatory (HIPAA/GDPR)**: For real-world patient data, SightX requires a **Supabase B2B/Enterprise Plan**.
    - **Isolated Infrastructure**: Each institution must host a separate, sovereign database instance.
    - **Encryption**: Enterprise-grade encryption at rest and in transit is mandatory for HPI (Health Protected Information).

---

> [!IMPORTANT]
> **Clinical Disclaimer**: SightX is currently a research and educational project. It is intended to demonstrate the potential of AI in telemedicine and should not be used as a primary diagnostic tool without clinical validation and institutional approval.

---
**Built with care to serve people**