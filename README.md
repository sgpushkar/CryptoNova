# CryptoNova

CryptoNova is a full-stack real-time cryptocurrency tracking platform built with TypeScript, React, Vite, TailwindCSS, Express, WebSocket, MongoDB, and Mongoose. It streams live Binance prices and keeps server-side alerts running even when the frontend is closed.

## Folder Structure

```text
crypto-tracker/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertPanel.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   └── Navbar.tsx
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── main.tsx
│   │   ├── store.ts
│   │   └── types.ts
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.cjs
│   ├── tailwind.config.cjs
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── alertEngine.ts
│   │   ├── models.ts
│   │   ├── notifications.ts
│   │   ├── priceStore.ts
│   │   ├── server.ts
│   │   ├── types.ts
│   │   └── websocket.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
├── package.json
└── README.md
```

## What It Does

- Streams live Binance `@ticker` updates for 50 major pairs and rebroadcasts them to the frontend.
- Stores live prices and chart history in memory for fast chart rendering and instant alert checks.
- **Binance Portfolio Sync**: Connect your Binance account (Read-Only API) to track your live portfolio value across supported assets.
- Persists alerts and alert history in MongoDB.
- Supports server-side alert rules for:
  - price above INR
  - price below INR
  - move by INR from creation price
  - move by percentage from creation price
  - **holding-value reminders**: trigger when your specific holding quantity reaches a target value.
- Keeps alerts active even while the user is offline or the frontend is closed.
- Includes a premium dark UI with glassmorphism, live flashing price changes, search, sorting, watchlist, mobile layouts, and skeleton loading states.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB running locally or a MongoDB Atlas connection string
- (Optional) Binance API Key and Secret (Read-Only) for Portfolio Sync

## Install

From the project root:

```bash
npm install
```

## Environment Variables

Edit [server/.env](/c:/Users/Pushkar%20Mhatre/Downloads/Cryptonova/server/.env) and set:

```env
PORT=8080
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/cryptonova
```

Optional INR conversion override:

```env
USD_TO_INR=83.35
```

## Run In Development

Run both frontend and backend together:

```bash
npm run dev
```

Or run them separately:

```bash
npm run dev:server
npm run dev:client
```

Frontend:

- `http://localhost:5173`

Backend:

- `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`

## Production Build

Build both apps:

```bash
npm run build
```

Start the production server:

```bash
npm run start --workspace server
```

The server is configured to serve the built client from `client/dist` when it exists.

## MongoDB Setup

### Local MongoDB

1. Install MongoDB Community Edition.
2. Start the MongoDB service.
3. Keep `MONGO_URI=mongodb://127.0.0.1:27017/cryptonova` in [server/.env](/c:/Users/Pushkar%20Mhatre/Downloads/Cryptonova/server/.env).

### MongoDB Atlas

1. Create a cluster in MongoDB Atlas.
2. Create a database user and allow your IP in network access.
3. Replace `MONGO_URI` with the Atlas connection string.

## Feature Notes

- Watchlist and cached UI state are stored locally in the browser via Zustand persist.
- Alerts and triggered history are stored in MongoDB.
- The backend alert engine also performs a recurring sweep every second so alert checks continue even if the frontend is not connected.
- Realtime updates are batched before broadcast to avoid unnecessary frontend re-renders.
- Binance API credentials used for portfolio sync are processed strictly in-memory and are never persisted to the database.

## Verified

This workspace has already been verified with:

```bash
npm install
npm run build
```
