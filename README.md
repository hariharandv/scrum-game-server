# Scrum Velocity Simulator - Backend API

Express + TypeScript REST API for the Scrum Velocity Simulator game.

## Features

- Game state management
- Board operations (card movement, sprint planning)
- Dice rolling mechanics with D6 system
- Role-based permissions
- Metrics and analytics
- RESTful API endpoints

## Tech Stack

- Express.js
- TypeScript
- Node.js

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API Endpoints

- `GET /api/game/state` - Get current game state
- `POST /api/game/create` - Create new game
- `POST /api/game/advance-phase` - Advance to next phase
- `POST /api/game/roll-dice` - Roll dice for player
- `GET /api/board/state` - Get board state
- `POST /api/board/move-card` - Move card between columns
- `POST /api/board/pull-to-sprint` - Pull cards to sprint backlog
- `POST /api/board/allocate-capacity` - Allocate team capacity

## Environment Variables

Create a `.env` file:

```
PORT=5000
NODE_ENV=development
```

## Deployment

This backend is set up for two production modes:

1) Vercel (serverless) — recommended for the hosted deployment

- The Express app is exported for the Vercel runtime via `api/index.ts`.
- `vercel.json` routes all requests to this function so existing routes like `/api/game/*` and `/api/board/*` work as-is.

Monorepo note: If deploying from the repository root, set the Vercel Project “Root Directory” to `server/`.

No custom build command is required for the function, but you can keep `npm install` as the Install Command.

2) Long-running Node server (Render/Fly/Railway/VM)

- Build: `npm run build` (outputs to `dist/`)
- Start: `npm start` (runs `node dist/server.js`)

Environment variables:

```
PORT=5000
NODE_ENV=production
```

## License

MIT
