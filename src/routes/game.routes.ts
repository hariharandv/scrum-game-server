import { Router } from 'express';
import { gameController } from '../controllers/game.controller';

const router = Router();

// Game management routes
router.post('/start', gameController.startGame);
router.get('/state', gameController.getGameState);
router.post('/:gameId/phase', gameController.advancePhase);
router.post('/:gameId/roll-d6', gameController.rollD6);
router.post('/:gameId/turn', gameController.advanceTurn);
router.get('/:gameId/metrics', gameController.getMetrics);

export default router;