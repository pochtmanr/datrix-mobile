# Datrix Mobile

Field survey management app built with React Native, Expo, and Supabase.

## Tech Stack

- **Framework:** React Native 0.81 + Expo SDK 54 + Expo Router
- **Styling:** NativeWind (Tailwind CSS for RN) + HeroUI Native
- **Backend:** Supabase (Auth, Database, Storage)
- **State:** Zustand + React Query
- **Offline:** expo-sqlite for local data persistence
- **Maps:** react-native-maps
- **Auth:** Google Sign-In, Apple Sign-In, Email/Password via Supabase Auth

## Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode 15+ (for development builds)
- Android: Android Studio (for development builds)

## Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.local.example .env.local
```

### Required API Keys

| Variable | Description | Where to get it |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |

### Optional (Development)

| Variable | Description | Where to get it |
|---|---|---|
| `SUPABASE_PAT` | Supabase Personal Access Token (for MCP dev tools) | [Supabase Dashboard](https://supabase.com/dashboard) → Account → Access Tokens |
| `GITHUB_PAT` | GitHub Personal Access Token (for MCP dev tools) | [GitHub Settings](https://github.com/settings/tokens) |

### Hardcoded Configuration (app.json / source)

These are configured directly in the codebase:

| Key | Location | Description |
|---|---|---|
| Google iOS Client ID | `app/(auth)/login.tsx` | Google OAuth iOS client ID |
| Google Web Client ID | `app/(auth)/login.tsx` | Google OAuth Web client ID |
| Google `reservedClientId` | `app.json` → `ios.config.googleSignIn` | Reversed iOS client ID for URL scheme |
| Supabase URL (fallback) | `app.json` → `extra.SUPABASE_URL` | Fallback Supabase URL |

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Project Structure

```
app/                  # Expo Router file-based routing
├── (auth)/           # Authentication screens (login, register)
├── (surveyor)/       # Surveyor role screens (projects, records, maps)
├── (manager)/        # Manager role screens (dashboard, team)
├── _layout.tsx       # Root layout with providers
└── index.tsx         # Entry point / auth router
src/
├── api/              # Supabase client & React Query hooks
├── auth/             # Auth context & provider
├── components/       # Shared UI components
├── db/               # SQLite offline database
├── lib/              # Utilities, constants, network helpers
├── store/            # Zustand stores (sync state)
└── theme/            # Global CSS, colors, theme config
```
