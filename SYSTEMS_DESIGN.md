# SightX: Systems Design & Architecture

This document provides a high-level technical overview of the SightX platform, visualizing the orchestration between clinical users, microservices, and AI inference pipelines.

---

## 1. High-Level Architecture
SightX utilizes a decoupled microservices architecture to ensure clinical reliability, scalability, and data sovereignty.

```mermaid
graph TD
    User((Clinical Resident)) -- HTTPS/Web --> FE[Frontend: React/MUI/Vite]
    FE -- REST API --> BE[Backend: Node.js/Express]
    BE -- Multipart/Form-Data --> IE[Inference Engine: FastAPI/PyTorch]
    FE -- JWT Auth/RLS --> DB[(Supabase: Postgres/Auth)]
    IE -- Internal REST --> BE
```

---

## 2. Diagnostic Request Flow
The following sequence diagram illustrates the lifecycle of a single retinal scan, from fundus capture to clinical verification.

```mermaid
sequenceDiagram
    participant U as Clinical Resident
    participant FE as React Frontend
    participant BE as Node.js Backend
    participant IE as Inference Engine (AI)
    participant DB as Supabase Cloud

    U->>FE: Upload Fundus Image (.jpg/.png)
    FE->>BE: POST /api/scan/upload (image)
    BE->>IE: POST /predict (image)
    
    note over IE: TTA Ensemble (108 passes)
    note over IE: Bayesian Prior Correction
    note over IE: Risk-Minimized Decision
    
    IE-->>BE: JSON (AI Tier, Confidence)
    BE-->>FE: JSON Aggregated Results
    
    U->>FE: Verify & Confirm Diagnosis
    FE->>DB: INSERT INTO patient_scans (RLS Active)
    DB-->>FE: Success Acknowledgement
    FE-->>U: Record Synchronized
```

---

## 3. Data Model & Sovereignty
SightX maintains strict data isolation through Supabase's relational structure and Row Level Security (RLS).

```mermaid
erDiagram
    AUTH_USER ||--|| PROFILE : "1:1 link via ID"
    AUTH_USER ||--o{ PATIENT_SCAN : "Owns"
    
    AUTH_USER {
        uuid id
        string email
    }
    
    PROFILE {
        uuid id PK
        string practitioner_id
        string role
        string clinical_unit
    }
    
    PATIENT_SCAN {
        uuid id PK
        string patient_id
        uuid practitioner_id FK
        string ai_diagnosis
        string final_diagnosis
    }
```

---

## 4. Service Definitions

### 🛸 Frontend (Presentation Layer)
- **Role**: Handles clinical user flow, auth handshake, and diagnostic visualization.
- **Security**: Supabase Auth (JWT) + RLS Policies.
- **Design**: "No-Line" clinical aesthetic via MUI.

### 🛰 Backend (Orchestration Layer)
- **Role**: Acts as a stateful proxy for the inference engine, managing multipart streams and security logs.
- **Connectivity**: Internal Docker networking (`http://inference-engine:8000`).

### 🧠 Inference Engine (AI Layer)
- **Role**: High-performance ResNet-50 V2 inference.
- **Processing**: Monte-Carlo TTA Ensemble + Bayesian decision theory.

### 🗄 persistence (Data Layer)
- **Role**: HIPAA-ready Postgres storage via Supabase B2B.

---
© 2026 SightX • Systems Design Documentation
