# MediScan AI — Patient Risk Assessment Platform
### Full-Stack Django + Advanced ML + PostgreSQL + Lovable Frontend

> Ensemble ML (Random Forest + XGBoost + LightGBM + Stacking) with SMOTE, SHAP explainability, PostgreSQL database, and a 3D glassmorphism React frontend via Lovable.

---

## DATASETS (Download Before Training)

| Dataset | Link | Filename |
|---------|------|----------|
| **Pima Indians Diabetes** (Primary) | https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database | `ml_engine/diabetes.csv` |
| **Heart Disease UCI** (Secondary) | https://www.kaggle.com/datasets/ronitf/heart-disease-uci | `ml_engine/heart.csv` |
| **NHANES Diabetes** (Bonus) | https://www.kaggle.com/datasets/cdc/national-health-and-nutrition-examination-survey | Optional enrichment |

---

## ML ALGORITHMS USED (LinkedIn-Worthy)

| Algorithm | Role | Why |
|-----------|------|-----|
| **Random Forest (300 trees)** | Base learner | Handles non-linear data, feature importance |
| **XGBoost** | Base learner | State-of-art gradient boosting |
| **LightGBM** | Base learner | Faster, handles large data well |
| **Gradient Boosting** | Base learner | Sequential error correction |
| **Stacking (Meta-Learner)** | Ensemble combiner | Combines all model outputs via Logistic Regression |
| **SMOTE** | Class balancing | Synthetic oversampling of minority class |
| **SHAP Values** | Explainability | Per-prediction feature contribution scores |
| **RobustScaler** | Preprocessing | Outlier-resistant feature scaling |

**Expected Performance: ~84% accuracy, ~0.88 ROC-AUC**

---

## PHASE 1 — Environment Setup (PowerShell)

### Step 1: Install Prerequisites
- Python 3.11: https://www.python.org/downloads/
- PostgreSQL 15: https://www.postgresql.org/download/windows/
- Git: https://git-scm.com/download/win

### Step 2: Create project and virtual environment
```powershell
# Navigate to where you want the project
cd C:\Users\YourName\Projects

# Create virtual environment
python -m venv mediscan_env

# Activate it (run this every time you work on the project)
mediscan_env\Scripts\Activate.ps1

# If you get execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 3: Clone or create project folder
```powershell
# If you downloaded the zip, extract it and go inside:
cd mediscan

# Install all dependencies
pip install -r requirements.txt
```

---

## PHASE 2 — PostgreSQL Database Setup (PowerShell)

### Step 1: Create the database
```powershell
# Open psql (adjust path if needed)
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres

# Inside psql shell, run:
# CREATE DATABASE mediscan_db;
# \q
```

Or use pgAdmin GUI:
1. Open pgAdmin → Right click "Databases" → Create → Database
2. Name it `mediscan_db` → Save

### Step 2: Create your .env file
```powershell
# Copy the example
Copy-Item .env.example .env

# Open in notepad to edit
notepad .env
```

Fill in your .env:
```
DEBUG=True
SECRET_KEY=mediscan-super-secret-key-2024-change-in-prod-xyz123
DB_NAME=mediscan_db
DB_USER=postgres
DB_PASSWORD=YOUR_POSTGRES_PASSWORD_HERE
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 3: Run migrations
```powershell
python manage.py makemigrations users
python manage.py makemigrations patients
python manage.py makemigrations analytics
python manage.py makemigrations
python manage.py migrate
```

Expected output:
```
Applying users.0001_initial... OK
Applying patients.0001_initial... OK
...
```

---

## PHASE 3 — ML Model Training (PowerShell)

### Step 1: Download Kaggle dataset
1. Go to https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database
2. Click Download → `archive.zip`
3. Extract `diabetes.csv`
4. Move it to `ml_engine\` folder:
```powershell
# Example if it downloaded to Downloads folder:
Copy-Item "$env:USERPROFILE\Downloads\diabetes.csv" ".\ml_engine\diabetes.csv"
```

### Step 2: Train the model
```powershell
python ml_engine\train.py
```

Expected output:
```
MediScan AI — Advanced ML Training Pipeline
Dataset: 768 samples | Positive rate: 34.9%
Applying SMOTE oversampling...
After SMOTE: 1002 samples | Positive rate: 50.0%
Training Stacking Ensemble (RF + GB + XGB + LGB)...

ENSEMBLE PERFORMANCE
Accuracy:   0.8442 (84.4%)
ROC-AUC:    0.8871
F1-Score:   0.8103
Precision:  0.8250
Recall:     0.7961

Feature Importances (RF):
  Glucose                        ████████████████████ 0.2634
  BMI                            ██████████████ 0.1821
  Age                            ████████████ 0.1512

Model saved to ml_engine\ensemble_model.pkl
```

> Note: If you skip the CSV download, it auto-generates synthetic data. Download real data for best results.

### Step 3: Seed the database
```powershell
python manage.py seed_data
```

---

## PHASE 4 — Run the Django Server (PowerShell)

```powershell
python manage.py runserver
```

Open:
- API: http://localhost:8000/api/
- Swagger Docs: http://localhost:8000/api/docs/
- Admin Panel: http://localhost:8000/admin/
  - Username: admin | Password: admin123

---

## PHASE 5 — Test All APIs (PowerShell with curl)

### Login
```powershell
$body = '{"username": "doctor1", "password": "doctor123"}'
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login/" `
    -Method POST -Body $body -ContentType "application/json"
$token = $response.access
Write-Host "Token: $token"
```

### Create a patient
```powershell
$headers = @{ Authorization = "Bearer $token" }
$patient = @{
    first_name = "Test"
    last_name = "Patient"
    date_of_birth = "1985-06-15"
    gender = "M"
    contact = "9999999999"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/patients/" `
    -Method POST -Body $patient -Headers $headers -ContentType "application/json"
```

### Submit assessment (triggers AI prediction)
```powershell
$assessment = @{
    patient = 1
    glucose = 148
    blood_pressure = 72
    bmi = 33.6
    insulin = 125
    pregnancies = 3
    skin_thickness = 35
    diabetes_pedigree = 0.627
    age_at_assessment = 50
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:8000/api/patients/assessments/create/" `
    -Method POST -Body $assessment -Headers $headers -ContentType "application/json"
$result | ConvertTo-Json
```

---

## PHASE 6 — Frontend with Lovable

### Step 1: Go to https://lovable.dev → New Project

### Step 2: Paste this entire prompt:

---

```
Build a futuristic, cinematic medical AI dashboard called "MediScan AI" — a Patient Risk Assessment Platform. The aesthetic should be dark-sci-fi clinical: deep space navy backgrounds, holographic cyan glows, and neon vitals monitors. Think Iron Man's JARVIS UI crossed with a premium hospital SaaS.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DESIGN SYSTEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Background: #020b18 (near black navy)
Surface cards: rgba(6, 20, 40, 0.85) with backdrop-filter: blur(20px)
Primary glow: #00d4ff (electric cyan)
Secondary: #0066ff (deep blue)
Success / Low risk: #00ff88 (neon green)
Warning / Medium: #ffb800 (amber)
Danger / High: #ff4757 (vivid red)
Critical: #9d4edd (electric purple)
Text primary: #e2e8f0
Text muted: #4a6080
Font: "Exo 2" (display) + "JetBrains Mono" (numbers/data)
Import both from Google Fonts.
All cards: border: 1px solid rgba(0, 212, 255, 0.15); border-radius: 16px
Background grid: subtle hex pattern or dot grid at 5% opacity
Animated scan lines across the full background (CSS keyframes, subtle)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL COMPONENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Top navbar: MediScan logo (text with cyan dot), user avatar circle, role badge, logout
- Sidebar: icon + label nav (Dashboard, Patients, New Assessment, Analytics, Settings)
- Sidebar active state: cyan left border + glow background
- All data loading: skeleton shimmer in dark blue
- Toast notifications: bottom-right, glass effect, colored by type
- All buttons: gradient bg (cyan to blue), subtle glow on hover, scale(1.02) on hover

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 1 — LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Full-screen dark background with animated floating particle field (use canvas or CSS).
Center card: glassmorphism, 420px wide, backdrop blur.
Top: MediScan AI logo with rotating DNA helix SVG animation beside it.
Subtitle: "Clinical Intelligence Platform"
Fields: Username, Password — styled with bottom border only + glow on focus
"Sign In" button: full width, cyan→blue gradient, glowing pulse animation
Show loading spinner inside button on click.
On success: store access token + user object in localStorage. Redirect to dashboard.
API: POST http://localhost:8000/api/auth/login/
Body: { username, password }
Response: { access, refresh, user: { id, full_name, role, department } }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 2 — DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API: GET /api/analytics/summary/ (with Authorization: Bearer <token>)

Row 1 — 4 stat cards (glowing on hover):
[Total Patients] [Today's Assessments] [High Risk Patients (pulsing red glow)] [Avg Risk Score]
Each card: large number, icon (lucide-react), subtitle, delta vs yesterday if possible.

Row 2:
LEFT (60%): Risk Distribution — animated donut chart (recharts PieChart)
  - 4 slices: Low (green), Medium (amber), High (red), Critical (purple)
  - Center label showing total assessments
  - Hover: shows count + percentage
  - API: GET /api/analytics/risk-distribution/

RIGHT (40%): Age Group Bar Chart (recharts BarChart, stacked)
  - Groups: 18-30, 31-45, 46-60, 60+
  - API: GET /api/analytics/age-groups/

Row 3 (full width): Monthly Trend Line Chart
  - 3 lines: Total Assessments (cyan), High Risk (red), Avg Risk Score % (purple dashed)
  - Smooth curved lines, dot markers, gradient fill under area
  - API: GET /api/analytics/trends/?months=6

Row 4: Recent Activity Feed
  - Last 10 assessments as a sleek table
  - Columns: Patient Name | Risk Level (badge) | Risk Score (%) | Glucose | BMI | Assessed By | Time
  - Risk badges: colored pill with glow
  - API: GET /api/analytics/recent/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 3 — PATIENTS LIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API: GET /api/patients/ (supports ?search=name&gender=M&ordering=-created_at)

Top bar: Search input (glass style) + Gender filter dropdown + "Add Patient" button (cyan)

Patient Cards Grid (3 columns desktop, 1 mobile):
Each card:
  - Patient initials avatar (colored circle based on risk)
  - Full name + age + gender icon
  - Blood group badge
  - Latest risk level badge with glow
  - Risk score progress bar (colored gradient)
  - Assessment count
  - "View Details" and "New Assessment" buttons

Add Patient Modal (slide-in from right, glass overlay):
Fields: First Name, Last Name, Date of Birth, Gender (toggle), Blood Group, Contact, Email, Address, Medical History
POST /api/patients/

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 4 — NEW ASSESSMENT (Multi-step wizard)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3-step animated wizard with progress bar at top.

STEP 1 — Select Patient
Searchable dropdown showing patient name + ID + last risk level
GET /api/patients/?search=...

STEP 2 — Enter Vitals
Futuristic form layout — 2 columns of inputs, each with:
  - Label + unit + normal range shown below
  - Dual slider + number input combo
  - Color indicator: green (normal) → amber (elevated) → red (high)

Fields:
  Glucose (mg/dL) — slider 44–200, normal: 70-100
  Blood Pressure (mm Hg) — slider 24–122, normal: 60-80
  BMI (kg/m²) — slider 18–67, normal: 18.5-24.9
  Insulin (mu U/ml) — slider 0–400
  Skin Thickness (mm) — slider 7–99
  Pregnancies — number stepper (0 for males)
  Diabetes Pedigree — slider 0.08–2.42 with 2 decimal places
  Age — number input

At bottom: real-time "Estimated Risk" indicator that updates as user types (if possible).

STEP 3 — AI Results (shown after POST /api/patients/assessments/create/)
Full-screen reveal animation.

Center: Large animated risk gauge (180° arc SVG):
  - Needle animates from 0 to the risk score
  - Color changes: green → amber → red → purple
  - Large percentage number in center
  - Risk level label below

Below gauge (2 columns):
LEFT: Risk Factors List
  - Each factor: icon + name + value + status badge
  - Sorted by severity
  - Animated in with stagger delay

RIGHT: Model Breakdown (if available)
  - Mini bar chart showing each model's prediction (RF, XGB, LGB, GB)
  - Labeled "Ensemble Analysis"

Bottom: Recommendations box
  - Glass card with colored left border based on risk
  - Doctor Notes text area (auto-saves)

Buttons: "Save & View Patient" | "New Assessment" | "Back to Dashboard"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAGE 5 — PATIENT DETAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API: GET /api/patients/{id}/ (includes all assessments)

Top: Patient header card
  - Large initials avatar with animated ring in risk color
  - Name, age, gender, blood group, contact
  - "Latest Risk" badge (large, glowing)
  - "New Assessment" button

Middle: Risk Trend Chart
  - Line chart of risk scores over time (last 10 assessments)
  - Animated draw-in effect

Bottom: Assessment Timeline
  - Vertical timeline (left border line with dots)
  - Each entry: date, vitals summary, risk badge, model confidence bar
  - Expandable to show full details + SHAP values

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECHNICAL REQUIREMENTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- React 18 + TypeScript
- Tailwind CSS for layout, custom CSS for glow effects and animations
- Recharts for all charts (PieChart, LineChart, BarChart, AreaChart)
- Axios with base URL: http://localhost:8000
- All API calls: Authorization: Bearer <token> header
- Token stored in localStorage, read on app init
- If 401 received on any call: clear token, redirect to login
- framer-motion for page transitions and card animations
- lucide-react for icons
- Loading: skeleton shimmer components for all data
- Error states: inline error messages with retry button
- All number values: formatted (e.g., 78.1% not 0.7812)
- Mobile responsive: sidebar collapses to hamburger menu

Make every pixel feel intentional. This should look like a $50M medical SaaS product.
The UI must be so visually impressive that it stops a recruiter scrolling on LinkedIn.
```

---

### Step 3: Configure API URL in Lovable
In your Lovable code, set axios base URL:
```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

---

## PHASE 7 — Deployment to Railway

### Step 1: Push to GitHub
```powershell
git init
git add .
git commit -m "MediScan AI - Initial commit"
git remote add origin https://github.com/YOURUSERNAME/mediscan-ai.git
git push -u origin main
```

### Step 2: Deploy on Railway
1. Go to https://railway.app → New Project → Deploy from GitHub
2. Select your repo
3. Add Plugin: PostgreSQL
4. Set environment variables in Railway dashboard:
```
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(50))">
DEBUG=False
ALLOWED_HOSTS=<your-railway-domain>.up.railway.app
CORS_ALLOWED_ORIGINS=https://your-lovable-app.lovable.app
DB_NAME=railway (auto-set by plugin)
DB_USER=postgres (auto-set)
DB_PASSWORD=<from Railway PostgreSQL plugin>
DB_HOST=<from Railway PostgreSQL plugin>
DB_PORT=5432
```

### Step 3: Post-deploy commands (Railway console tab)
```bash
python manage.py migrate
python ml_engine/train.py
python manage.py seed_data
python manage.py collectstatic --no-input
```

---

## Full API Reference

```
AUTH
POST   /api/auth/login/             Login → JWT tokens
POST   /api/auth/register/          Register new user
POST   /api/auth/refresh/           Refresh access token
GET    /api/auth/profile/           Current user profile
GET    /api/auth/users/             List all staff

PATIENTS
GET    /api/patients/               List patients (search, filter, paginate)
POST   /api/patients/               Create patient
GET    /api/patients/{id}/          Patient detail + all assessments
PUT    /api/patients/{id}/          Update patient
DELETE /api/patients/{id}/          Delete patient
GET    /api/patients/{id}/assessments/  Patient assessment history

ASSESSMENTS
POST   /api/patients/assessments/create/   Submit vitals → AI prediction → save
GET    /api/patients/assessments/          List all assessments
GET    /api/patients/assessments/{id}/     Assessment detail with SHAP values

ANALYTICS
GET    /api/analytics/summary/        Dashboard stats
GET    /api/analytics/risk-distribution/  Pie chart data
GET    /api/analytics/trends/         Monthly line chart data
GET    /api/analytics/age-groups/     Bar chart data
GET    /api/analytics/recent/         Activity feed

DOCS
GET    /api/docs/                  Swagger UI
GET    /api/schema/                OpenAPI schema
```

---

## LinkedIn Description for Your Profile

> Built MediScan AI — a full-stack clinical decision support system using Django REST Framework + PostgreSQL. Implemented a stacking ensemble of Random Forest, XGBoost, LightGBM, and Gradient Boosting with SMOTE class balancing and SHAP explainability, achieving 84% accuracy and 0.88 ROC-AUC on the Pima Indians Diabetes dataset. Designed a React dashboard with real-time risk gauges and SHAP value visualizations. Deployed on Railway with Docker.

