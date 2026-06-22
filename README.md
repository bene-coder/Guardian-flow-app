# GuardianFlow — Mobile App (Expo + React Native)

The official cross-platform mobile frontend for **GuardianFlow** — a fleet
safety platform that pairs real-time GPS tracking with Solana-blockchain
audit logging of every safety-critical event (panic, geofence violation,
dead-man switch).

Built to plug directly into the existing GuardianFlow Node.js + Express +
Socket.io + Supabase + Solana backend.

---

## Quick start

```bash
# 1. Install dependencies
cd guardianflow-app
npm install

# 2. (optional) Configure the backend URL at build time
cp .env.example .env
#   EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:3000   # default for Android emulator
#   GOOGLE_MAPS_API_KEY=...                         # optional, see "Maps" below

# 3. Start the dev server
npm start
# press `a` to launch on Android emulator, `i` for iOS simulator, `w` for web.
```

> **Backend URL is configurable from inside the app too** — open
> **Settings → Backend URL** and point it at any GuardianFlow backend. The
> value is persisted in `SecureStore`, so it survives restarts. On Android
> emulator, use `http://10.0.2.2:3000` to reach your dev machine's
> `localhost:3000`.

---

## What this app does

### Driver mode
| Screen | What it does |
|---|---|
| **Live Map** | Full-screen map showing your vehicle marker, heading, speed, and geofence circles. Floating red **PANIC** FAB opens the panic modal. |
| **Alerts** | Read-only feed of alerts about your vehicle, with blockchain-verified badges. |
| **My Vehicle** | Identity card, live trip stats (speed / heading / lat / lng / last update), status switcher (active / maintenance / emergency / inactive). |
| **Settings** | Backend URL, tracking toggles, role switch, sign out. |

### Manager mode
| Screen | What it does |
|---|---|
| **Live Map** | Same map, but shows **all** vehicles. Tap any marker → vehicle detail. |
| **Alerts** | Full feed with **Acknowledge** + **Resolve** actions on every alert. |
| **Vehicles** | Fleet list with status badges + **Register vehicle** modal. |
| **Geofences** | Create / list / delete geofences. Create flow uses a mini map to pick the center. |
| **History** | Pick a vehicle + time window (1h / 6h / 24h / 7d), see the route polyline, distance, duration, max speed, and the raw ping list. |
| **Settings** | Same as driver, plus you can switch back to driver role. |

### Panic modal (driver-only, full-screen)
Hold the red button for 3 seconds → app reads one-shot GPS →
`POST /api/alerts/panic` → backend saves alert, logs SHA-256 hash to Solana
devnet, broadcasts via socket → UI shows confirmation with the alert ID and
a "Blockchain Verified" badge linking to Solana explorer.

---

## Architecture

```
guardianflow-app/
├── app/                           # Expo Router (file-based routing)
│   ├── _layout.tsx                # Root: boots SecureStore, picks auth vs tabs
│   ├── auth/login.tsx             # Role picker + identity form
│   ├── (tabs)/
│   │   ├── _layout.tsx            # Tab bar (role-conditional), boots socket + tracking
│   │   ├── index.tsx              # Live Map
│   │   ├── alerts.tsx             # Alerts feed
│   │   ├── vehicles.tsx           # Driver: my vehicle  ·  Manager: fleet list
│   │   ├── geofence.tsx           # Geofence manager (manager only)
│   │   ├── history.tsx            # Trip history (manager only)
│   │   └── settings.tsx           # Backend URL, tracking, role, logout
│   ├── panic.tsx                  # Hold-to-confirm panic modal
│   └── vehicle/[id].tsx           # Vehicle detail
│
├── src/
│   ├── api/                       # HTTP + Socket.io clients
│   │   ├── client.ts              #   Axios w/ runtime-configurable baseURL (SecureStore)
│   │   ├── socket.ts              #   Singleton socket.io-client + event dispatcher
│   │   ├── vehicles.ts            #   /api/vehicles
│   │   ├── location.ts            #   /api/location (+ bulk + history)
│   │   ├── alerts.ts              #   /api/alerts (+ /panic)
│   │   ├── geofence.ts            #   /api/geofence
│   │   └── types.ts               #   Shared TS types + snake_case↔camelCase normalizers
│   ├── store/                     # Zustand stores (persisted via AsyncStorage)
│   │   ├── auth.ts                #   isAuthed + role
│   │   ├── settings.ts            #   backendUrl, tracking prefs, identity, role
│   │   ├── vehicles.ts            #   list + CRUD
│   │   ├── alerts.ts              #   list + ingest from socket + Acknowledge/Resolve
│   │   ├── geofences.ts           #   list + create/delete
│   │   └── locations.ts           #   latest-per-vehicle + my own GPS reading
│   ├── location/
│   │   └── tracker.ts             # expo-location + expo-task-manager background GPS
│   ├── hooks/
│   │   ├── useSocketSync.ts       # Wires socket events → stores
│   │   ├── useTracking.ts         # Starts/stops foreground + background GPS
│   │   └── useRefresh.ts          # Pull-to-refresh helper
│   ├── components/                # Presentational + small composite UI
│   │   ├── Screen.tsx             #   Layout wrapper (safe-area + scroll + header)
│   │   ├── Card.tsx               #   Card + SectionHeader
│   │   ├── Button.tsx             #   Primary / secondary / danger / ghost
│   │   ├── StatusBadge.tsx        #   Colored pill for vehicle + alert status
│   │   ├── AlertCard.tsx          #   Full alert row with blockchain badge + actions
│   │   ├── BlockchainBadge.tsx    #   "Verified" badge → Solana explorer deep link
│   │   ├── ConnectionPill.tsx     #   "Live / Connecting / Offline" indicator
│   │   ├── PanicFAB.tsx           #   Floating red panic button (driver mode)
│   │   ├── EmptyState.tsx         #   Friendly empty/error placeholder
│   │   └── VehicleMarker.tsx      #   Marker color helper
│   ├── theme/
│   │   ├── colors.ts              # "Dark Safety" palette + map dark style
│   │   └── index.ts               #   Re-exports + status→color maps
│   └── utils/
│       ├── format.ts              #   timeAgo, formatSpeed, formatCoords, truncateHash…
│       └── geo.ts                 #   Haversine, geofence check, bearing (mirrors backend)
│
├── assets/                        # Placeholder icon/splash PNGs (replace before shipping)
├── app.json / app.config.ts       # Expo config (permissions, plugins, scheme)
├── babel.config.js
├── tsconfig.json
└── .env.example
```

### Data flow

```
   ┌─────────────────┐
   │  ExpoLocation   │  (foreground watchPositionAsync + background task)
   └────────┬────────┘
            │ POST /api/location { vehicleId, lat, lng, speed, heading, accuracy }
            ▼
   ┌─────────────────┐    HTTP REST      ┌────────────────────────────┐
   │  GuardianFlow   │ ◄──────────────►  │  Supabase (vehicles,       │
   │  Backend        │                   │   locations, alerts,       │
   │  (Express +     │                   │   geofences)               │
   │   Socket.io)    │                   └────────────────────────────┘
   │                 │    Solana memo
   │                 │ ──────────────►   ┌────────────────────────────┐
   │                 │                   │  Solana devnet             │
   │                 │                   │  (SHA-256 of alert data    │
   │                 │                   │   written as memo)         │
   └────────┬────────┘                   └────────────────────────────┘
            │ Socket.io events
            │  location-update, panic-alert, geofence-violation,
            │  dead-man-alert, alert-updated, vehicle-status-changed…
            ▼
   ┌─────────────────┐
   │  This app       │  (socket.io-client → Zustand stores → React components)
   └─────────────────┘
```

---

## Backend compatibility

This app expects the GuardianFlow backend you already built. The exact
endpoints it calls:

| Method | Endpoint | Used by |
|---|---|---|
| `GET`  | `/api/health` | Settings → "Test" button + connection pill |
| `GET`  | `/api/vehicles` | Vehicles list, map markers |
| `POST` | `/api/vehicles` | Register-vehicle modal |
| `PATCH`| `/api/vehicles/:id/status` | Vehicle status switcher |
| `DELETE`| `/api/vehicles/:id` | (not exposed in UI — soft delete via PATCH) |
| `GET`  | `/api/location/latest` | Map markers (initial load) |
| `POST` | `/api/location` | Foreground + background GPS pings |
| `POST` | `/api/location/bulk` | (reserved — not yet wired) |
| `GET`  | `/api/location/:id/history?hours=N` | Trip History screen |
| `POST` | `/api/alerts/panic` | Panic modal |
| `GET`  | `/api/alerts` | Alerts feed |
| `PATCH`| `/api/alerts/:id/status` | Acknowledge / Resolve buttons |
| `GET`  | `/api/geofence` | Geofence list + map circles |
| `POST` | `/api/geofence` | Create-geofence modal |
| `DELETE`| `/api/geofence/:id` | Delete button |
| `POST` | `/api/geofence/check` | (reserved) |

Socket.io events consumed: `initial-state`, `location-update`, `panic-alert`,
`alert-updated`, `vehicle-registered`, `vehicle-status-changed`,
`geofence-created`, `geofence-deleted`, `geofence-violation`,
`dead-man-alert`, `bulk-sync`, `vehicle-history`.

---

## Maps

The app uses `react-native-maps`. On Android it defaults to Google Maps —
**for production you must add a Google Maps API key**:

1. Get a key from <https://console.cloud.google.com/google/maps-apis>
2. Set it as `GOOGLE_MAPS_API_KEY` in your `.env` (or as an environment
   variable when running `eas build`).
3. `app.config.ts` reads it and wires it into both the iOS and Android
   native configs.

If no key is set, the map still renders with the platform default tiles
and a custom dark style overlay — enough for local dev.

---

## Background GPS

Background location is implemented with `expo-location` +
`expo-task-manager` + `expo-background-fetch`:

- **Foreground** (app open): high-accuracy GPS, pings every 5s or 5m of
  movement.
- **Background** (app closed): balanced accuracy, pings every 60s. On
  Android this runs as a foreground service with a persistent notification
  ("GuardianFlow is tracking") so the OS doesn't kill it.

Toggle either in **Settings → Location Tracking**.

### Permissions requested

- Android: `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`,
  `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `VIBRATE`
- iOS: `NSLocationWhenInUseUsageDescription`,
  `NSLocationAlwaysAndWhenInUseUsageDescription`

---

## Building a release APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Build a preview APK (debug dev client, no store submission)
eas build -p android --profile preview

# Or a production AAB for Play Store
eas build -p android --profile production
```

Add an `eas.json` at the project root:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "preview": {
      "android": { "buildType": "apk", "gradleCommand": ":app:assembleRelease" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

---

## Known limitations / next steps

- **Auth is local-only.** The login screen is a role picker + identity form.
  To plug in real auth (Supabase OTP, JWT, etc.), replace the body of
  `handleLogin` in `app/auth/login.tsx` — the rest of the app reads
  identity from the `useSettings` store.
- **No push notifications.** `expo-notifications` is installed but not
  wired up — the backend would need to send FCM/APNs tokens. For now,
  alerts only surface while the app is in the foreground via socket.
- **No offline queue.** If the backend is unreachable, location pings are
  dropped. A future iteration could queue them in AsyncStorage and flush
  via `POST /api/location/bulk` when connectivity returns.
- **Placeholder brand assets.** `assets/icon.png`, `splash.png`,
  `adaptive-icon.png`, and `favicon.png` are minimal placeholders
  generated by `scripts/make_assets.js`. Replace with real branding
  before shipping.
- **Panic modal progress ring.** The current implementation uses a simple
  rotating border for the progress ring. A true conic-gradient ring would
  require `react-native-svg` (already installed) — easy upgrade.

---

## Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Start on Android emulator
npm run ios        # Start on iOS simulator
npm run web        # Start in web browser
npm run typecheck  # Run tsc --noEmit
npm run build:android  # EAS build (preview APK)
```

---

## Tech stack

- **Framework:** Expo SDK 52 + React Native 0.76
- **Routing:** Expo Router v4 (file-based)
- **Language:** TypeScript 5.3
- **State:** Zustand 5 (persisted via AsyncStorage)
- **HTTP:** Axios (runtime-configurable baseURL via SecureStore)
- **Realtime:** socket.io-client 4
- **Maps:** react-native-maps 1.18 (Google Maps on Android, Apple Maps on iOS)
- **Location:** expo-location + expo-task-manager + expo-background-fetch
- **Haptics:** expo-haptics (used by the panic button)
- **Icons:** @expo/vector-icons (Ionicons)

---

## License

MIT — matches the backend.
