// Game service - Core game orchestration
import { DiceService, D6RollRequest } from './dice.service';
import { BoardService } from './board.service';
import { ValidationService } from './validation.service';
import { MetricsService } from './metrics.service';
import { GameStateStore } from './game-state.store';
import { GameState, Card, ScrumMasterState, Player } from '../types/game';

// Helper function to find a card by ID across all columns
function findCardById(cardId: string, gameState: GameState): Card | null {
  for (const cards of Object.values(gameState.boardState.columns) as Card[][]) {
    const card = cards.find((c: Card) => c.id === cardId);
    if (card) return card;
  }
  return null;
}

export const gameService = {
  startGame: async (players?: Player[]) => {
    try {
      // Default players if none provided
      const defaultPlayers: Player[] = players || [
        { id: '1', name: 'Stakeholder', role: 'Stakeholder', actionCount: 0 },
        { id: '2', name: 'Product Owner', role: 'ProductOwner', actionCount: 0 },
        { id: '3', name: 'Scrum Master', role: 'ScrumMaster', actionCount: 0 },
        { id: '4', name: 'Developer 1', role: 'Developer-Impl', actionCount: 0 },
        { id: '5', name: 'Developer 2', role: 'Developer-Intg', actionCount: 0 },
        { id: '6', name: 'QA Tester', role: 'QATester', actionCount: 0 },
        { id: '7', name: 'Release Manager', role: 'ReleaseManager', actionCount: 0 },
        { id: '8', name: 'Customer', role: 'Customer', actionCount: 0 }
      ];
      
      const session = GameStateStore.createGame(defaultPlayers);
      
      // Add some sample cards to the funnel
      const sampleCards: Card[] = [
        {
          id: `card-${Date.now()}-1`,
          title: 'User Authentication',
          description: 'Implement login and registration',
          effort: 5,
          status: 'Funnel',
          createdTurn: 1,
          revertCount: 0,
          currentColumn: 'Funnel',
          isTechnicalDebt: false,
          cycleTime: null
        },
        {
          id: `card-${Date.now()}-2`,
          title: 'Dashboard UI',
          description: 'Create main dashboard interface',
          effort: 3,
          status: 'Funnel',
          createdTurn: 1,
          revertCount: 0,
          currentColumn: 'Funnel',
          isTechnicalDebt: false,
          cycleTime: null
        },
        {
          id: `card-${Date.now()}-3`,
          title: 'API Integration',
          description: 'Connect to third-party APIs',
          effort: 5,
          status: 'Funnel',
          createdTurn: 1,
          revertCount: 0,
          currentColumn: 'Funnel',
          isTechnicalDebt: false,
          cycleTime: null
        }
      ];
      
      session.gameState.boardState.columns.Funnel = sampleCards;
      
      return {
        success: true,
        gameState: session.gameState,
        gameId: session.id,
        message: 'Game started successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start game: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  getCurrentGame: async () => {
    try {
      // For MVP: Return the most recent active game
      const currentGame = GameStateStore.getCurrentGame();
      if (!currentGame) {
        return { success: false, message: 'No active game found' };
      }

      return {
        success: true,
        gameState: currentGame.gameState,
        players: currentGame.players,
        isActive: currentGame.isActive
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get game state: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  getGameState: async (gameId: string) => {
    try {
      const session = GameStateStore.getGame(gameId);
      if (!session) {
        return { success: false, message: 'Game not found' };
      }

      return {
        success: true,
        gameState: session.gameState,
        players: session.players,
        isActive: session.isActive
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get game state: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  advancePhase: async (gameId: string) => {
    try {
      const success = GameStateStore.advancePhase(gameId);
      if (!success) {
        return { success: false, message: 'Could not advance phase' };
      }

      const session = GameStateStore.getGame(gameId);
      return {
        success: true,
        newPhase: session?.gameState.boardState.currentPhase,
        message: 'Phase advanced successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to advance phase: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  rollD6: async (gameId: string, cardId: string) => {
    try {
      // Get the game session
      const session = GameStateStore.getGame(gameId);
      if (!session) {
        throw new Error('Game not found');
      }

      const gameState = session.gameState;

      // Find the card in the game state
      const card = findCardById(cardId, gameState);
      if (!card) {
        throw new Error(`Card ${cardId} not found`);
      }

      // Validate the roll can be performed
      const validation = ValidationService.validateCardExists(cardId, gameState);
      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      // Prepare roll request
      const rollRequest: D6RollRequest = {
        cardId,
        currentColumn: card.currentColumn,
        card,
        scrumMasterState: gameState.scrumMasterState
      };

      // Perform the D6 roll
      const rollResult = DiceService.rollD6(rollRequest);

      // Apply the movement using board service
      const movementRequest = {
        card,
        fromColumn: card.currentColumn,
        toColumn: rollResult.destinationColumn,
        rollResult,
        scrumMasterState: gameState.scrumMasterState
      };

      const movementResult = BoardService.moveCard(movementRequest);

      if (!movementResult.success) {
        throw new Error(movementResult.message);
      }

      // Update the game state with the card movement
      const moveSuccess = GameStateStore.moveCard(gameId, cardId, card.currentColumn, rollResult.destinationColumn);
      if (!moveSuccess) {
        throw new Error('Failed to update game state');
      }

      // Update ScrumMaster state if tokens were used
      if (movementResult.tokensUsed && movementResult.tokensUsed > 0) {
        const currentTokens = gameState.scrumMasterState.tokensAvailable;
        GameStateStore.updateScrumMasterState(gameId, {
          tokensAvailable: currentTokens - movementResult.tokensUsed,
          tokensUsed: gameState.scrumMasterState.tokensUsed + movementResult.tokensUsed
        });
      }

      // Activate technical debt if applicable
      if (movementResult.technicalDebtActivated) {
        GameStateStore.updateScrumMasterState(gameId, {
          technicalDebtActive: true,
          technicalDebtExpiresAtTurn: gameState.boardState.currentTurn + 2
        });
      }

      return {
        success: true,
        rollResult,
        movementResult,
        message: 'D6 roll completed successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `D6 roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  getMetrics: async (gameId: string) => {
    try {
      const session = GameStateStore.getGame(gameId);
      if (!session) {
        return { success: false, message: 'Game not found' };
      }

      const metricsResult = MetricsService.calculateMetrics({ gameState: session.gameState });
      return {
        success: true,
        metrics: metricsResult
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get metrics: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  validateMove: async (gameId: string, cardId: string, toColumn: string) => {
    try {
      const session = GameStateStore.getGame(gameId);
      if (!session) {
        return { success: false, message: 'Game not found' };
      }

      const card = findCardById(cardId, session.gameState);
      if (!card) {
        return { success: false, message: `Card ${cardId} not found` };
      }

      const validation = ValidationService.validateCardMovement({
        card,
        toColumn: toColumn as any, // TODO: Proper type casting
        gameState: session.gameState,
        scrumMasterState: session.gameState.scrumMasterState
      });

      return {
        success: true,
        validation
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  // Additional methods for game management
  endGame: async (gameId: string) => {
    try {
      const success = GameStateStore.endGame(gameId);
      return {
        success,
        message: success ? 'Game ended successfully' : 'Game not found'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to end game: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  },

  getActiveGames: async () => {
    try {
      const games = GameStateStore.getActiveGames();
      return {
        success: true,
        games: games.map(g => ({
          id: g.id,
          playerCount: g.players.length,
          currentTurn: g.gameState.boardState.currentTurn,
          currentPhase: g.gameState.boardState.currentPhase,
          createdAt: g.createdAt
        }))
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get active games: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
};