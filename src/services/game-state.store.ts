// Game state store - In-memory persistence for MVP
import { GameState, Card, BoardColumn, Player, PlayerRole, ScrumMasterState } from '../types/game';

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

    // Initialize empty game state with WIP limits
    const gameState: GameState = {
      id: sessionId,
      boardState: {
        columns: {
          Funnel: { slots: [], queue: [], wipLimit: 999 }, // Unlimited for intake
          ProductBacklog: { slots: [], queue: [], wipLimit: 1 }, // 1 prioritized item
          SprintBacklog: { slots: [], queue: [], wipLimit: 3 }, // 3 committed items
          Implementation: { slots: [], queue: [], wipLimit: 3 }, // 3 active development
          Integration: { slots: [], queue: [], wipLimit: 1 }, // 1 integration testing
          Testing: { slots: [], queue: [], wipLimit: 2 }, // 2 QA validation
          PreDeployment: { slots: [], queue: [], wipLimit: 6 }, // 6 release preparation
          Production: { slots: [], queue: [], wipLimit: 999 } // Unlimited completed work
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
        },
        currentPlayerTurn: 'ProductOwner' // Start with PO in Sprint Planning
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
   * Add a card to a specific column (to queue by default)
   */
  static addCard(gameId: string, column: BoardColumn, card: Card): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    // Try to add to slots first, then queue
    const columnState = session.gameState.boardState.columns[column];
    if (columnState.slots.length < columnState.wipLimit) {
      columnState.slots.push(card);
    } else {
      columnState.queue.push(card);
    }
    session.updatedAt = new Date();
    return true;
  }

  /**
   * Move a card between columns (handles slots and queues)
   */
  static moveCard(gameId: string, cardId: string, fromColumn: BoardColumn, toColumn: BoardColumn): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    const fromColumnState = session.gameState.boardState.columns[fromColumn];
    const toColumnState = session.gameState.boardState.columns[toColumn];

    // Find card in slots or queue
    let card: Card | undefined;
    let cardIndex = fromColumnState.slots.findIndex(c => c.id === cardId);
    let isInSlots = true;

    if (cardIndex === -1) {
      cardIndex = fromColumnState.queue.findIndex(c => c.id === cardId);
      isInSlots = false;
    }

    if (cardIndex === -1) return false;

    // Remove card from source
    if (isInSlots) {
      card = fromColumnState.slots.splice(cardIndex, 1)[0];
    } else {
      card = fromColumnState.queue.splice(cardIndex, 1)[0];
    }

    // Update card status
    card.currentColumn = toColumn;
    card.status = toColumn;

    // Add to destination (try slots first, then queue)
    if (toColumnState.slots.length < toColumnState.wipLimit) {
      toColumnState.slots.push(card);
    } else {
      toColumnState.queue.push(card);
    }

    session.updatedAt = new Date();
    return true;
  }

  /**
   * Remove a card from the game
   */
  static removeCard(gameId: string, cardId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    for (const columnState of Object.values(session.gameState.boardState.columns)) {
      // Check slots
      let cardIndex = columnState.slots.findIndex((card: Card) => card.id === cardId);
      if (cardIndex !== -1) {
        columnState.slots.splice(cardIndex, 1);
        session.updatedAt = new Date();
        return true;
      }

      // Check queue
      cardIndex = columnState.queue.findIndex((card: Card) => card.id === cardId);
      if (cardIndex !== -1) {
        columnState.queue.splice(cardIndex, 1);
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
   * Advance to next player turn within the current phase
   */
  static advancePlayerTurn(gameId: string): boolean {
    const session = this.sessions.get(gameId);
    if (!session) return false;

    const playerRoles: PlayerRole[] = [
      'Stakeholder',
      'ProductOwner', 
      'ScrumMaster',
      'Developer-Impl',
      'Developer-Intg',
      'QATester',
      'ReleaseManager',
      'Customer'
    ];

    const currentIndex = playerRoles.indexOf(session.gameState.currentPlayerTurn);
    const nextIndex = (currentIndex + 1) % playerRoles.length;
    
    session.gameState.currentPlayerTurn = playerRoles[nextIndex];
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