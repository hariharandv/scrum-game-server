import { Request, Response, NextFunction } from 'express';
import { boardService } from '../services/board.service';
import { gameService } from '../services/game.service';
// import { webSocketService } from '../services/websocket.service';

export const boardController = {
  getBoardState: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For MVP: Get current game
      const gameStateResult = await gameService.getCurrentGame();
      if (gameStateResult.success && gameStateResult.gameState) {
        res.json({ success: true, data: gameStateResult.gameState.boardState });
      } else {
        res.status(404).json({ success: false, message: gameStateResult.message || 'No active game found' });
      }
    } catch (error) {
      next(error);
    }
  },

  moveCard: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cardId, fromColumn, toColumn } = req.body;
      
      if (!cardId || !fromColumn || !toColumn) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: cardId, fromColumn, toColumn' 
        });
        return;
      }
      
      const result = await boardService.moveCard(cardId, fromColumn, toColumn);
      
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getCurrentGame();
        if (gameStateResult.success) {
          res.json({ success: true, data: gameStateResult.gameState });
        } else {
          res.json({ success: true, data: result });
        }
      } else {
        res.status(400).json({ success: false, message: result.message || 'Failed to move card' });
      }
    } catch (error) {
      console.error('Error moving card:', error);
      next(error);
    }
  },

  pullToSprint: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cardIds } = req.body;
      
      if (!cardIds || !Array.isArray(cardIds)) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required field: cardIds (array)' 
        });
        return;
      }
      
      const result = await boardService.pullToSprint(cardIds);
      
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getCurrentGame();
        if (gameStateResult.success) {
          res.json({ success: true, data: gameStateResult.gameState });
        } else {
          res.json({ success: true, data: result });
        }
      } else {
        res.status(400).json({ success: false, message: result.message || 'Failed to pull cards' });
      }
    } catch (error) {
      console.error('Error pulling cards to sprint:', error);
      next(error);
    }
  },

  allocateCapacity: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cardId, effort } = req.body;
      
      if (!cardId || !effort) {
        res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: cardId, effort' 
        });
        return;
      }
      
      const result = await boardService.allocateCapacity({ cardId, effort });
      
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getCurrentGame();
        if (gameStateResult.success) {
          res.json({ success: true, data: gameStateResult.gameState });
        } else {
          res.json({ success: true, data: result });
        }
      } else {
        res.status(400).json({ success: false, message: result.message || 'Failed to allocate capacity' });
      }
    } catch (error) {
      console.error('Error allocating capacity:', error);
      next(error);
    }
  }
};