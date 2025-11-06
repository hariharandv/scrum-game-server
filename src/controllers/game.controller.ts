import { Request, Response, NextFunction } from 'express';
import { gameService } from '../services/game.service';
// import { webSocketService } from '../services/websocket.service';

export const gameController = {
  startGame: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { players } = req.body;
      const result = await gameService.startGame(players);
      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  getGameState: async (req: Request, res: Response, next: NextFunction) => {
    try {
      // For MVP: Get current game or return empty if none exists
      const result = await gameService.getCurrentGame();
      if (result.success) {
        res.json({ success: true, data: result.gameState });
      } else {
        // Return 404 but indicate no game exists
        res.status(404).json({ success: false, message: 'No active game found. Start a new game.' });
      }
    } catch (error) {
      next(error);
    }
  },

  advancePhase: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameId } = req.params;
      const result = await gameService.advancePhase(gameId);
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getGameState(gameId);
        // Broadcast phase advancement to all connected clients
        // if (gameStateResult.success) {
        //   webSocketService.broadcastGameUpdate(gameStateResult.gameState, 'phase_advanced');
        // }
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  advanceTurn: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameId } = req.params;
      const result = await gameService.advanceTurn(gameId);
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getGameState(gameId);
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  rollD6: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameId } = req.params;
      const { cardId } = req.body;
      const result = await gameService.rollD6(gameId, cardId);
      if (result.success) {
        // Get updated game state
        const gameStateResult = await gameService.getGameState(gameId);
        // Broadcast dice roll result to all connected clients
        // if (gameStateResult.success) {
        //   webSocketService.broadcastGameUpdate(gameStateResult.gameState, 'dice_rolled');
        // }
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  getMetrics: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameId } = req.params;
      const result = await gameService.getMetrics(gameId);
      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(404).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  endGame: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { gameId } = req.params;
      const result = await gameService.endGame(gameId);
      if (result.success) {
        res.json({ success: true, data: result });
      } else {
        res.status(404).json({ success: false, message: result.message });
      }
    } catch (error) {
      next(error);
    }
  },

  getActiveGames: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await gameService.getActiveGames();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
};