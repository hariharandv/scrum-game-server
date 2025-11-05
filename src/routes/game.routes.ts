import { Router } from 'express';
import { gameController } from '../controllers/game.controller';

const router = Router();

// Game management routes
router.post('/start', gameController.startGame);
router.get('/state', gameController.getGameState);
router.post('/phase', gameController.advancePhase);
router.post('/roll-d6', gameController.rollD6);
router.get('/metrics', gameController.getMetrics);

export default router;