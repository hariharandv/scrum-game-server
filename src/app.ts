import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

// Import routes
import gameRoutes from './routes/game.routes';
import boardRoutes from './routes/board.routes';

// Import WebSocket service (not used in serverless)
// import { webSocketService } from './services/websocket.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/game', gameRoutes);
app.use('/api/board', boardRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
