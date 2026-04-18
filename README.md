# 🚛 ELD Trip Planner

A full-stack web application for FMCSA-compliant Hours of Service (HOS) trip planning for property-carrying CMV drivers.

Built with **Django** (backend) + **React + Vite** (frontend).

---

## Features

- **Trip Planning**: Input current location, pickup, and dropoff → get a fully optimized HOS-compliant trip plan
- **Interactive Map**: Leaflet map with route polyline, stop markers, and timeline
- **ELD Log Sheets**: Authentic SVG Driver's Daily Log sheets generated per day — downloadable
- **FMCSA §395 Compliant**:
  - 11-hr driving limit / 14-hr on-duty window
  - 30-min break after 8 cumulative drive hours
  - 10-hr off-duty between shifts
  - 70-hr/8-day cycle tracking
  - Fuel stops every 1,000 miles (30 min each)
  - 1 hour for pickup + 1 hour for dropoff

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.2, Django REST Framework |
| Frontend | React 18, Vite 5, Leaflet.js |
| Geocoding | Nominatim (OpenStreetMap) — Free |
| Routing | OSRM (Open Source Routing Machine) — Free |
| Deployment | Railway (backend) + Vercel (frontend) |

---

## Local Development

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
python manage.py runserver 8000
```

Backend runs at: `http://localhost:8000`

**Test endpoint:**
```bash
curl -X POST http://localhost:8000/api/trip/plan/ \
  -H "Content-Type: application/json" \
  -d '{
    "current_location": "Chicago, IL",
    "pickup_location": "Indianapolis, IN",
    "dropoff_location": "Nashville, TN",
    "current_cycle_used": 0,
    "start_date": "2024-01-15"
  }'
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## Deployment

### Backend → Railway.app (Free)

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo, set root directory to `backend/`
3. Railway auto-detects the `Procfile` and deploys
4. Set environment variables:
   ```
   SECRET_KEY=your-random-secret-key-here
   DEBUG=False
   ```
5. Copy the Railway URL (e.g. `https://eld-planner.up.railway.app`)

### Frontend → Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Set **Root Directory** to `frontend/`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app
   ```
4. Deploy — Vercel auto-detects Vite and builds

---

## API Reference

### `POST /api/trip/plan/`

**Request Body:**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Indianapolis, IN",
  "dropoff_location": "Nashville, TN",
  "current_cycle_used": 20.5,
  "start_date": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "trip_summary": {
    "total_distance_miles": 480.0,
    "total_drive_time_hours": 8.7,
    "total_trip_time_hours": 10.7,
    "num_days": 1,
    "warnings": []
  },
  "locations": { "current": {...}, "pickup": {...}, "dropoff": {...} },
  "route": { "waypoints": [...], "total_distance_miles": 480.0 },
  "stops": [
    { "type": "pickup", "location": "Indianapolis, IN", "arrival_time": 3.27, "departure_time": 4.27, ... },
    { "type": "30min_break", "location": "...", ... },
    { "type": "dropoff", "location": "Nashville, TN", ... }
  ],
  "daily_logs": [
    {
      "day": 0,
      "total_miles": 480,
      "hours": { "off_duty": 13.5, "sleeper_berth": 0, "driving": 8.7, "on_duty_not_driving": 1.8 },
      "events": [...]
    }
  ],
  "log_svgs": ["<svg>...</svg>"]
}
```

---

## HOS Rules Reference (49 CFR Part 395)

| Rule | Limit |
|------|-------|
| Driving limit per shift | 11 hours |
| On-duty window | 14 consecutive hours |
| Mandatory break | 30 min after 8 cumulative drive hrs |
| Off-duty between shifts | 10 consecutive hours |
| Weekly on-duty limit | 70 hours / 8 days |
| Weekly restart | 34 consecutive hours off |
| Fuel interval | 1,000 miles (30 min stop) |
| Pickup/Dropoff | 1 hour each |

---

## Project Structure

```
eld-trip-planner/
├── backend/
│   ├── config/
│   │   ├── settings.py        # Django settings
│   │   ├── urls.py            # Root URL config
│   │   └── wsgi.py            # WSGI entrypoint
│   ├── trip_planner/
│   │   ├── hos_calculator.py  # FMCSA HOS engine
│   │   ├── log_generator.py   # SVG ELD log generator
│   │   ├── views.py           # REST API views
│   │   └── urls.py            # App URLs
│   ├── requirements.txt
│   └── Procfile               # Railway/Heroku deploy
└── frontend/
    ├── src/
    │   ├── App.jsx            # Main app + navigation
    │   ├── components/
    │   │   ├── TripForm.jsx   # Input form
    │   │   ├── RouteMap.jsx   # Leaflet map + timeline
    │   │   └── ELDLogViewer.jsx # SVG log viewer
    │   ├── main.jsx
    │   └── index.css
    ├── vite.config.js
    └── package.json
```
