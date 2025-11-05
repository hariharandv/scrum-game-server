import { Router } from 'express';
import { boardController } from '../controllers/board.controller';

const router = Router();

// Board state routes (MVP: Single-session mode without gameId)
router.get('/', boardController.getBoardState);
router.post('/move-card', boardController.moveCard);
router.post('/pull-to-sprint', boardController.pullToSprint);
router.post('/allocate-capacity', boardController.allocateCapacity);

export default router;