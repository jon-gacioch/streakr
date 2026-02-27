# STREAKR — AI Running Route Planner

*New city. Same streak.*

STREAKR lets runners describe where they are and what kind of run they want in plain English, then uses GPT-4.1 with function calling to plan, generate, and display a real running route on an interactive map.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

You'll need:

| Service | Sign Up |
|---------|---------|
| **OpenAI** | https://platform.openai.com/api-keys |
| **Mapbox** | https://account.mapbox.com |
| **OpenRouteService** | https://openrouteservice.org/dev/#/signup |

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **Mapbox GL JS** for interactive maps
- **OpenAI GPT-4.1** with function calling for route planning
- **OpenRouteService** for foot-running routing & elevation
- **Overpass API** (OpenStreetMap) for place search
- **Tailwind CSS** for styling
- **Recharts** for elevation profiles

## How It Works

1. User types a natural language run request
2. GPT-4.1 geocodes the location, searches for parks/trails, generates waypoints, and calls the routing API
3. The route appears on the map with distance, elevation, and estimated time
4. User can refine: "make it longer", "avoid that highway", "add a park"
5. Export the route as GPX for Garmin, Apple Watch, Strava, etc.
