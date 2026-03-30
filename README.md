# SightX: Diabetic Retinopathy Detection System

## 🔬 The SightX Story
Diabetes is a global challenge, and Diabetic Retinopathy remains a leading cause of preventable blindness. For many, the first symptom is permanent vision loss. **SightX was built with a personal mission:** to bridge the gap between advanced medical AI and the patients who need it most, honoring a family journey with diabetes.

By combining a **ResNet-50 V2** backbone with Bayesian decision theory and a "No-Line" clinical UI, SightX provides a robust, safe, and beautiful screening experience.

---

## 🏗 System Architecture
SightX is built as a highly-decoupled microservices stack, ensuring scalability and clinical reliability.

![System Architecture](./Docs/SightX.png)

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

## 📋 Prerequisites

Before launching the SightX stack, ensure you have the following installed:

1. **Docker & Docker Compose**: (Required for Orchestration)
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Compose).
2. **Supabase Account**: (Required for Persistence)
   - [Sign up for free](https://supabase.com/dashboard/sign-up).
3. **Local Dev Tools** (Optional - only if running services individually):
   - **Node.js 18+**: For Frontend and Backend.
   - **Python 3.10+**: For the Inference Engine.

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

## 🔗 Supabase Persistence & Setup

SightX uses **Supabase** (Postgres + Auth + RLS) to handle practitioner profiles and diagnostic records. Follow these steps to sync your local instance with the cloud.

### 1. Environment Configuration
Create a `.env` file in the root directory (and ensure it's copied to `frontend/`, `backend/`, and `inference-engine/` if running outside Docker):
```bash
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_PUBLISHABLE_KEY
```

### 2. SQL Foundation (Schema)
Run the following serialized SQL in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) to initialize the clinical tables:

```sql
-- ── 1. Create Profiles (Practitioner Data) ──
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  practitioner_id text unique,
  role text check (role in ('resident', 'fellow', 'attending', 'superuser')),
  clinical_unit text,
  created_at timestamptz default now()
);

-- ── 2. Create Patient Scans (Diagnostic Records) ──
create table patient_scans (
  id uuid primary key default gen_random_uuid(),
  patient_name text not null,
  patient_id text not null,
  practitioner_id uuid references auth.users not null,
  clinician_name text,
  ai_diagnosis text,
  final_diagnosis text,
  created_at timestamptz default now()
);

-- ── 3. Profile Automation (Trigger) ──
-- This automatically creates a profile row when a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, role)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 3. Clinical Security (RLS)
Enable Row Level Security (RLS) to ensure data sovereignty.
```sql
alter table profiles enable row level security;
alter table patient_scans enable row level security;

-- Example: Clinicians can only view their own unit's scans
create policy "Clinicians can view all scans" on patient_scans
  for select using (auth.role() = 'authenticated');

create policy "Clinicians can insert scans" on patient_scans
  for insert with check (auth.uid() = practitioner_id);
```

### 🧪 Research vs. B2B Deployment
- **Research/Dev**: The [Supabase Free Plan](https://supabase.com/pricing) is sufficient for prototyping and individual trials.
- **Institutional (B2B)**: For hospital-grade, **HIPAA/GDPR** compliant environments, a **B2B/Enterprise Plan** is required to support dedicated database instances and enhanced audit logs.

---

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