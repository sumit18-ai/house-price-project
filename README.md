# Future Estate — Enterprise House Price Valuation Engine 🏡⚡

[![CI Pipeline](https://github.com/sumit18-ai/house-price-project/actions/workflows/ci.yml/badge.svg)](https://github.com/sumit18-ai/house-price-project/actions)
![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)
![React 18](https://img.shields.io/badge/React-18-61dafb.svg)
![Render](https://img.shields.io/badge/Deploy-Render-black.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

An enterprise-grade, high-performance real estate valuation application featuring ensemble machine learning pipelines, geospatial radar analytics, interactive 3D particle backgrounds, micro-services API architecture, and automated CI/CD workflows.

---

## 🌟 Key Features & Enterprise Capabilities

- **Ensemble Machine Learning Engines**: Simultaneously runs 6 regressor pipelines:
  - Linear Regression
  - Ridge Regression ($L_2$ regularization)
  - Lasso Regression ($L_1$ regularization)
  - ElasticNet Regression
  - Decision Tree Regressor
  - Random Forest Regressor (Primary fallback with log-transformed target optimization)
- **Model Compression & Optimization**: High-compression model persistence using `joblib` (`compress=3`), reducing memory footprint by over 80% (from 34MB to 5MB).
- **Enterprise Flask Backend API**:
  - Restructured with production Gunicorn WSGI server.
  - Strict Pydantic-level parameter validation (area, bedrooms, bathrooms, coordinates, location type).
  - Health check (`/health`) and Model Discovery metadata (`/api/v1/models/info`) endpoints.
  - Structured logging and environment-driven CORS configuration.
- **Modern React 18 UI**:
  - Preset quick selectors ("Luxury Estate", "Suburban Villa", "Urban Penthouse", "Starter Home").
  - Dynamic Render cold-start status indicator (gracefully handles free-tier wake-up delays).
  - One-click JSON Valuation Report export.
  - Dark mode glassmorphic interface with Framer Motion, Leaflet geospatial maps, and Recharts trajectory graphs.
- **Production Readiness & CI/CD**:
  - GitHub Actions automated test & build workflow (`.github/workflows/ci.yml`).
  - Render Blueprint Infrastructure-as-Code (`render.yaml`) for 1-click deployment.

---

## 🏗️ Architecture Overview

```
house-price-project/
├── backend/
│   ├── api.py              # Enterprise Flask API with endpoints & validation
│   ├── train.py            # Model training, compression & metrics calculation
│   ├── generate_data.py    # Synthetic real-estate data generation engine
│   ├── wsgi.py             # Production Gunicorn entrypoint
│   ├── test_api.py         # Pytest automated test suite
│   ├── requirements.txt    # Pinned Python dependencies
│   ├── metrics.json        # Pre-calculated R², MAE & RMSE evaluation report
│   └── *.pkl               # Compressed scikit-learn model pipelines
├── frontend/
│   ├── src/
│   │   ├── App.js          # Core React application logic & state
│   │   ├── index.css       # Design tokens & glassmorphism theme
│   │   └── components/     # Leaflet maps & 3D background visualizers
│   └── package.json        # Frontend React 18 configuration
├── .github/workflows/
│   └── ci.yml              # GitHub Actions CI workflow
├── render.yaml             # Render deployment blueprint (Backend + Frontend)
├── .gitignore              # Repository file exclusion filters
└── README.md               # Documentation
```

---

## ⚡ Quick Start (Local Development)

### 1. Backend Setup (Flask API)

```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate | On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt

# Train models & compute metrics
python train.py

# Run development API server (Port 5000)
python api.py
```

Run tests:
```bash
pytest test_api.py
```

### 2. Frontend Setup (React App)

```bash
cd frontend
npm install
npm start
```

The UI will open at `http://localhost:3000`.

---

## 🚀 Deployment Guide

### Deploy on Render (Recommended)

1. Fork or push this repository to your GitHub account (`https://github.com/sumit18-ai/house-price-project.git`).
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and provision:
   - `house-price-backend`: Python Gunicorn Web Service
   - `house-price-frontend`: React Static Site
6. Click **Apply**. Both services will build, pass health checks, and launch live automatically!

---

## 📄 API Documentation

### `GET /health`
Returns system readiness status and loaded model count.
```json
{
  "available_models": ["linear", "ridge", "lasso", "elastic", "tree", "forest"],
  "models_loaded": 6,
  "status": "UP",
  "total_models": 6
}
```

### `POST /predict`
Submits real estate parameters and retrieves ensemble valuations.

**Request Body:**
```json
{
  "area": 2500,
  "bedrooms": 3,
  "bathrooms": 2,
  "latitude": 19.0760,
  "longitude": 72.8777,
  "location": "urban"
}
```

**Response Body:**
```json
{
  "price": 18500000.0,
  "linear": 18100000.0,
  "ridge": 18150000.0,
  "lasso": 18200000.0,
  "elastic": 18180000.0,
  "tree": 18400000.0,
  "forest": 18500000.0
}
```

---

## 📜 License
Licensed under the [MIT License](LICENSE).
