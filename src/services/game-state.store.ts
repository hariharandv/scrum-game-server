// Game state store - In-memory persistence for MVP
import { GameState, Card, BoardColumn, Player, ScrumMasterState } from '../types/game';

export interface GameSession {
  id: string;
  gameState: GameState;
  createdAt: Date;
  updatedAt: Date;
  players: Player[];
  isActive: boolean;
}

export class GameStateStore {
  private static sessions: Map<string, GameSession> = new Map();

  /**
   * Create a new game session
   */
  static createGame(players: Player[]): GameSession {
    const sessionId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize empty game state
    const gameState: GameState = {
      id: sessionId,
      boardState: {
        columns: {
          Funnel: [],
          ProductBacklog: [],
          SprintBacklog: [],
          Implementation: [],
          Integration: [],
          Testing: [],
          PreDeployment: [],
          Production: []
        },
        currentTurn: 1,
        currentPhase: 'SprintPlanning',
        teamCapacity: 20,
        usedCapacity: 0,
        allocations: { 1: 0, 3: 0, 5: 0 },
        metrics: {
          velocityPerTurn: [],
          accumulatedScore: 0,
          cycleTimePerCard: new Map(),
          cumulativeFlowData: [],
          revertEvents: [],
          tokenUsageHistory: []
        }
      },
      players: players,
      scrumMasterState: {
        tokensAvailable: 3,
        tokensTotal: 3,
        tokensUsed: 0,
        technicalDebtActive: false,
        technicalDebtExpiresAtTurn: 0
      },
      maxTurns: 10,
      startedAt: new Date(),
      currentPlayerTurn: players[0]?.role || 'Developer-Impl'
    };

    const session: GameSession = {
      id: sessionId,
      gameState,
      createdAt: new Date(),
      updatedAt: new Date(),
      players,
      isActive: true
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a game session by ID
   */
  static getGame(gameId: string): GameSession | null {
    return this.sessions.get(gameId) || null;
  }

  /**
   * Update a game session
   */
  static updateGame(gameId: string, updates: Partial<GameState>): GameSession | null {
    const session = this.sessions.get(gameId);
    if (!session) return null;

    // Update the game state
    session.gameState = { ...session.gameState, ...updates };
    session.updatedAt = new Date();

    this.sessions.set(gameId, session);
    return session;
  }

  /**
   * Add a card to a specific column
   */
  static addCard(gameId: string, column: BoardColumn, card: Card): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    session.gameState.boardState.columns[column].push(card);
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Move a card between columns
   */
  static moveCard(gameId: string, cardId: string, fromColumn: BoardColumn, toColumn: BoardColumn): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    const fromCards = session.gameState.boardState.columns[fromColumn];
    const cardIndex = fromCards.findIndex(card => card.id === cardId);

    if (cardIndex === -1) return false;

    const card = fromCards.splice(cardIndex, 1)[0];
    card.currentColumn = toColumn;
    card.status = toColumn;

    session.gameState.boardState.columns[toColumn].push(card);
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Remove a card from the game
   */
  static removeCard(gameId: string, cardId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    for (const column of Object.values(session.gameState.boardState.columns)) {
      const cardIndex = column.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        column.splice(cardIndex, 1);
        session.updatedAt = new Date();
        return true;
      }
    }
    return false;
  }

  /**
   * Update ScrumMaster state
   */
  static updateScrumMasterState(gameId: string, updates: Partial<ScrumMasterState>): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    session.gameState.scrumMasterState = { ...session.gameState.scrumMasterState, ...updates };
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Advance to next turn
   */
  static advanceTurn(gameId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    session.gameState.boardState.currentTurn += 1;
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Advance to next phase
   */
  static advancePhase(gameId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    const phases: GameState['boardState']['currentPhase'][] = ['SprintPlanning', 'Execution', 'SprintReview', 'Retrospective'];
    const currentIndex = phases.indexOf(session.gameState.boardState.currentPhase);

    if (currentIndex < phases.length - 1) {
      session.gameState.boardState.currentPhase = phases[currentIndex + 1];
      session.updatedAt = new Date();
      return true;
    }
    return false;
  }

  /**
   * Get all active games
   */
  static getActiveGames(): GameSession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * End a game session
   */
  static endGame(gameId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    session.isActive = false;
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Get current active game (for MVP single-session mode)
   */
  static getCurrentGame(): GameSession | null {
    // Return the most recently created active game
    const allSessions = Array.from(this.sessions.values());
    const activeSessions = allSessions.filter(s => s.isActive);
    
    if (activeSessions.length === 0) return null;
    
    // Sort by createdAt descending and return the most recent
    activeSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return activeSessions[0];
  }

  /**
   * Clear all sessions (for testing)
   */
  static clearAll(): void {
    this.sessions.clear();
  }

  /**
   * Get game statistics
   */
  static getStats(): { totalGames: number; activeGames: number; totalPlayers: number } {
    const allSessions = Array.from(this.sessions.values());
    const activeGames = allSessions.filter(s => s.isActive);

    return {
      totalGames: allSessions.length,
      activeGames: activeGames.length,
      totalPlayers: activeGames.reduce((sum, game) => sum + game.players.length, 0)
    };
  }
}