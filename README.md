# AI Logistics Route & Delivery Exception Handler: Frontend

SaaS dashboard for monitoring deliveries and vehicles, detecting delivery exceptions, and getting AI-driven recommendations. It connects to a FastAPI + PostgreSQL backend.

## Features
- Login / Signup (temporary localStorage auth, see Limitations)
- Dashboard with KPI cards, live map (Leaflet + OpenStreetMap), recent deliveries and charts
- Deliveries and Vehicles pages with search, filters, and Add forms
- Mark a delivery as delivered
- Exceptions page and notification bell with new-exception alerts
- AI Decision Center: delay prediction, severity, AI decision, and action result
- Analytics page and light/dark theme, responsive layout

## Tech Stack
React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, Axios, Recharts, React-Leaflet

## Setup
1. Install Node.js (v18 or newer).
2. Clone the repo and install:
```
   npm install
```
3. Copy `.env.example` to `.env` and set:
```
   VITE_API_URL=http://127.0.0.1:8000
   VITE_ANALYZE_EXECUTES=true
```
   - `VITE_API_URL`: the backend address.
   - `VITE_ANALYZE_EXECUTES`: `true` if `/ai/route-analysis` also applies the action (current backend behavior). Set `false` only if the backend supports `?execute=false`, which enables Accept/Reject buttons.
4. Start the backend (FastAPI), then run:
```
   npm run dev
```
5. Open http://localhost:5173

## Backend Endpoints Used
`GET/POST /orders/`, `PUT /orders/{id}`, `GET/POST /vehicles/`, `GET /exceptions/`, `POST /road-route/calculate`, `POST /ai/route-analysis`, `POST /actions/execute`

## Limitations
- Authentication is a placeholder stored in the browser. The backend has no JWT yet. All auth code is in one file, marked with a TODO for replacement.
- The backend has no edit or delete for vehicles, so those are not in the UI.
- Updates use polling (every 10 seconds for exceptions), not WebSockets.

## Team
- Backend + AI/ML: Namrata
- Frontend + Dashboard: [Your name]