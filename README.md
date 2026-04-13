<div align="center">

# 🏥 MediScan AI
### Clinical Intelligence Platform for Diabetes Risk Assessment

[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=flat-square&logo=django)](https://djangoproject.com)
[![React](https://img.shields.io/badge/React-18-cyan?style=flat-square&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-green?style=flat-square&logo=supabase)](https://supabase.com)

**Live Demo:** [mediscan-ai-beta.vercel.app](https://mediscan-ai-beta.vercel.app)  
**API Docs:** [mediscan-backend-fspg.onrender.com/api/docs](https://mediscan-backend-fspg.onrender.com/api/docs)

</div>

---

## 📌 Overview

MediScan AI is a **one-stop clinical intelligence platform** that combines multi-disease risk screening, lab report analysis, medicine interaction checking, and an AI health assistant. Built for doctors and hospital administrators with production-grade security.

**Core capabilities:** 7+ disease screenings, lab report analyzer (upload + manual), drug interaction checker, NLP symptom analysis, AI health chatbot, and a diabetes ML ensemble trained on **70,692 CDC records** (ROC-AUC: 0.83, 88% recall).

---

## ✨ Features

### 🔐 Authentication & Access Control
- JWT-based authentication with auto token refresh
- Role-based access: Admin, Doctor, Nurse, Receptionist
- Password reset via email (Brevo API)
- Admin secret code for privileged account creation

### 🧠 AI Risk Assessment
- 3-step assessment wizard with 21 CDC health indicators
- Stacking ensemble: Random Forest + XGBoost + LightGBM + Gradient Boosting
- Real-time risk score with animated gauge (0-100%)
- SHAP-based risk factor explanation
- Model confidence scores and ensemble breakdown
- Clinical recommendations generated per assessment
- PDF report download

### 👥 Patient Management
- Full patient CRUD with search and filters
- Assessment history with trend charts
- Side-by-side assessment comparison
- Bulk patient import via CSV upload
- CSV export of all patients and assessments

### 📊 Analytics Dashboard
- Risk distribution donut chart
- Monthly trends area chart
- Age group stacked bar chart
- Real-time activity feed
- High-risk patient alerts

### 🩺 Multi-Disease Health Screening (NEW)
- AI-powered risk screening for 7 diseases: Diabetes, Heart Disease, Stroke, Kidney Disease, Liver Disease, Lung Disease, Thyroid
- Disease-specific health indicator forms
- Diabetes uses local ML ensemble; others use Google Gemini AI
- Risk score, factors, recommendations, and detailed AI analysis

### 🧪 Lab Report Analyzer (NEW)
- Manual entry with 6 lab panels: CBC, Lipid, Metabolic, Liver, Kidney, Thyroid
- Upload PDF/image reports — AI extracts values automatically (Gemini Vision)
- Rule-based flagging with medical reference ranges
- AI-powered clinical interpretation and recommendations

### 💊 Medicine Analyzer (NEW)
- Drug search powered by OpenFDA API (free, no key needed)
- Detailed drug info: uses, dosage, side effects, contraindications
- Drug interaction checker for up to 10 medications
- AI-enhanced explanations via Gemini

### 🤖 AI Health Assistant (NEW)
- **Symptom Checker**: Describe symptoms in natural language → AI suggests conditions, urgency, and next steps
- **Health Chat**: Conversational AI assistant for general health questions
- **Note Summarizer**: Paste clinical notes → structured summary with diagnoses, medications, and follow-up

### 🛡️ Admin Panel
- Separate admin dashboard (no sidebar)
- Doctor management: activate/deactivate accounts
- Permanent delete for doctors and patients
- Full assessment log with risk filters
- Top doctors by activity leaderboard

---

## 🤖 ML Architecture

```
CDC Health Survey Data (70,692 records)
            ↓
    SMOTETomek Resampling
            ↓
┌─────────────────────────────┐
│      Base Learners          │
│  Random Forest  │  XGBoost  │
│  LightGBM       │  Grad.Boost│
└─────────────────────────────┘
            ↓
    Logistic Regression (Meta)
            ↓
    Optimal Threshold: 0.3256
            ↓
      Risk Prediction
```

### Model Performance
| Metric | Score |
|--------|-------|
| ROC-AUC | 0.8303 |
| F1-Score | 0.7751 |
| Recall | 0.8765 |
| CV AUC | 0.8711 ± 0.0023 |

---

## 🏗️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Django 4.2 + DRF | REST API |
| PostgreSQL (Supabase) | Cloud database |
| JWT (SimpleJWT) | Authentication |
| scikit-learn | ML pipeline |
| XGBoost + LightGBM | Ensemble models |
| SHAP | Model explainability |
| Brevo API | Transactional email |
| Gunicorn | WSGI server |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS | Styling |
| Framer Motion | Animations |
| Recharts | Data visualization |
| jsPDF | PDF generation |
| Axios | HTTP client |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Render | Backend hosting (free) |
| Vercel | Frontend hosting (free) |
| Supabase | PostgreSQL database (free) |
| Brevo | Email service (free) |
| GitHub | Version control |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or Supabase account)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your credentials

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Train ML model (place diabetes.csv in ml_engine/ first)
python ml_engine/train.py

# Start server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install --legacy-peer-deps

# Create .env.local
echo "VITE_API_URL=http://localhost:8000" > .env.local

# Start development server
npm run dev
```

---

## ⚙️ Environment Variables

### Backend (.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key-min-50-chars
DB_NAME=mediscan_db
DB_USER=postgres
DB_PASSWORD=your-db-password
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
ADMIN_SECRET_CODE=your-admin-secret-code
FRONTEND_URL=http://localhost:5173
BREVO_API_KEY=your-brevo-api-key
SENDER_EMAIL=noreply@yourdomain.com
DEFAULT_FROM_EMAIL=MediScan AI <noreply@yourdomain.com>
GEMINI_API_KEY=your-gemini-api-key
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:8000
```

---

## 📡 API Endpoints

```
POST   /api/auth/login/                    JWT login
POST   /api/auth/register/                 Register new user
POST   /api/auth/refresh/                  Refresh JWT token
GET    /api/auth/profile/                  Get/update profile
POST   /api/auth/password/reset/           Request password reset
POST   /api/auth/password/reset/confirm/   Confirm password reset
POST   /api/auth/password/change/          Change password

GET    /api/patients/                      List patients
POST   /api/patients/                      Create patient
GET    /api/patients/{id}/                 Patient detail
POST   /api/patients/bulk-import/          CSV bulk import
GET    /api/patients/bulk-import/template/ Download CSV template

POST   /api/patients/assessments/create/   Run AI assessment
GET    /api/patients/assessments/          List assessments
GET    /api/patients/{id}/assessments/     Patient assessments

GET    /api/analytics/summary/             Dashboard stats
GET    /api/analytics/risk-distribution/   Risk distribution
GET    /api/analytics/trends/              Monthly trends
GET    /api/analytics/age-groups/          Age group analysis
GET    /api/analytics/recent/              Recent activity

GET    /api/admin-panel/dashboard/         Admin stats
GET    /api/admin-panel/doctors/           Doctor list
POST   /api/admin-panel/doctors/{id}/toggle/  Activate/deactivate
DELETE /api/admin-panel/doctors/{id}/delete/  Delete doctor
GET    /api/admin-panel/patients/          Patient list
DELETE /api/admin-panel/patients/{id}/delete/ Delete patient
GET    /api/admin-panel/export/            Export CSV

GET    /api/screening/diseases/             List available diseases
POST   /api/screening/create/              Run disease screening
GET    /api/screening/                     List screenings
GET    /api/screening/patient/{id}/        Patient screenings

GET    /api/reports/panels/                List lab panels
POST   /api/reports/analyze/               Analyze manual lab values
POST   /api/reports/upload/                Upload & analyze report
GET    /api/reports/                       List reports
GET    /api/reports/patient/{id}/          Patient reports

GET    /api/medicines/search/?q=name       Search drugs (OpenFDA)
GET    /api/medicines/{drug_name}/         Drug details + AI
POST   /api/medicines/interactions/        Check drug interactions
GET    /api/medicines/history/             Query history

POST   /api/ai/symptoms/                   Symptom analysis (NLP)
POST   /api/ai/chat/                       Health chatbot
POST   /api/ai/summarize-notes/            Clinical note summary

GET    /api/docs/                          Swagger UI
```

---

## 📁 Project Structure

```
mediscan-ai/
├── backend/
│   ├── config/          # Django settings & URLs
│   ├── users/           # Auth, profiles, password reset
│   ├── patients/        # Patient & assessment models
│   ├── analytics/       # Dashboard analytics views
│   ├── admin_panel/     # Hospital admin management
│   ├── ml_engine/       # ML training & prediction
│   │   ├── train.py     # Model training script
│   │   ├── predictor.py # Risk prediction logic
│   │   └── diabetes.csv # CDC training dataset
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── pages/       # Route pages
        ├── components/  # Reusable UI components
        └── lib/         # API client, utilities
```

---

## 🔒 Security

- JWT access tokens (24h) + refresh tokens (7 days)
- Auto token rotation on refresh
- Role-based endpoint protection
- Admin secret code for privileged registration
- Email-based password reset with 1-hour expiry tokens
- Superuser accounts hidden from admin panel
- Admins cannot delete other admin accounts

---

## 👨‍💻 Author

**Daksh Trivedi**

[![Email](https://img.shields.io/badge/Email-dakshtrivedi2@gmail.com-red?style=flat-square&logo=gmail)](mailto:dakshtrivedi2@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-Daksh910-black?style=flat-square&logo=github)](https://github.com/Daksh910)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-daksh--trivedi-blue?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/daksh-trivedi-68bab8259)

---

<div align="center">
<sub>Built with ❤️ using Django, React, and scikit-learn</sub>
</div>
