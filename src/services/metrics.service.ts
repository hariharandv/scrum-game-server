// Metrics service - Velocity, cycle time, and CFD calculations
import { Card, BoardColumn, GameState, GameMetrics, CardEffort, CFDSnapshot, RevertEvent, TokenEvent } from '../types/game';

export interface MetricsCalculationRequest {
  gameState: GameState;
  includeHistorical?: boolean;
}

export interface MetricsResult {
  current: GameMetrics;
  historical?: GameMetrics[];
  trends?: {
    velocityTrend: 'increasing' | 'decreasing' | 'stable';
    cycleTimeTrend: 'improving' | 'worsening' | 'stable';
    throughputTrend: 'increasing' | 'decreasing' | 'stable';
  };
}

export class MetricsService {
  /**
   * Calculate all game metrics for the current state
   */
  static calculateMetrics(request: MetricsCalculationRequest): MetricsResult {
    const { gameState, includeHistorical = false } = request;

    const currentMetrics = this.calculateCurrentMetrics(gameState);

    const result: MetricsResult = {
      current: currentMetrics
    };

    if (includeHistorical) {
      // TODO: Implement historical metrics tracking
      result.historical = [];
      result.trends = this.calculateTrends([]);
    }

    return result;
  }

  /**
   * Calculate metrics for the current game state
   */
  private static calculateCurrentMetrics(gameState: GameState): GameMetrics {
    const allCards = this.getAllCards(gameState);

    return {
      velocityPerTurn: this.calculateVelocityPerTurn(gameState),
      accumulatedScore: this.calculateAccumulatedScore(gameState),
      cycleTimePerCard: this.calculateCycleTimePerCard(allCards),
      cumulativeFlowData: this.calculateCumulativeFlowData(gameState),
      revertEvents: this.calculateRevertEvents(allCards),
      tokenUsageHistory: [] // TODO: Implement token usage tracking
    };
  }

  /**
   * Calculate velocity per turn (array of completed effort per turn)
   */
  private static calculateVelocityPerTurn(gameState: GameState): number[] {
    const currentTurn = gameState.boardState.currentTurn;
    const velocity: number[] = [];

    // Calculate completed effort for each turn
    for (let turn = 1; turn <= currentTurn; turn++) {
      const completedCards = gameState.boardState.columns.Production?.filter(card =>
        card.cycleTime === turn
      ) || [];

      const effort = completedCards.reduce((sum, card) => sum + card.effort, 0);
      velocity.push(effort);
    }

    return velocity;
  }

  /**
   * Calculate accumulated score (total completed effort)
   */
  private static calculateAccumulatedScore(gameState: GameState): number {
    const completedCards = gameState.boardState.columns.Production || [];
    return completedCards.reduce((sum, card) => sum + card.effort, 0);
  }

  /**
   * Calculate cycle time per card (Map of cardId -> cycle time)
   */
  private static calculateCycleTimePerCard(cards: Card[]): Map<string, number> {
    const cycleTimes = new Map<string, number>();

    cards.forEach(card => {
      if (card.cycleTime !== null) {
        cycleTimes.set(card.id, card.cycleTime);
      }
    });

    return cycleTimes;
  }

  /**
   * Calculate cumulative flow data snapshots
   */
  private static calculateCumulativeFlowData(gameState: GameState): CFDSnapshot[] {
    const currentTurn = gameState.boardState.currentTurn;
    const snapshots: CFDSnapshot[] = [];

    // Generate snapshots for each turn
    for (let turn = 1; turn <= currentTurn; turn++) {
      const columnCounts: Record<BoardColumn, number> = {
        Funnel: 0,
        ProductBacklog: 0,
        SprintBacklog: 0,
        Implementation: 0,
        Integration: 0,
        Testing: 0,
        PreDeployment: 0,
        Production: 0
      };

      // Count cards in each column at this turn (simplified - using current state)
      Object.entries(gameState.boardState.columns).forEach(([column, cards]) => {
        columnCounts[column as BoardColumn] = cards.length;
      });

      const totalWIP = Object.values(columnCounts).reduce((sum, count) => sum + count, 0);

      snapshots.push({
        turn,
        columnCounts,
        totalWIP
      });
    }

    return snapshots;
  }

  /**
   * Calculate revert events from card history
   */
  private static calculateRevertEvents(cards: Card[]): RevertEvent[] {
    const events: RevertEvent[] = [];

    cards.forEach(card => {
      // Create revert events based on revert count
      for (let i = 0; i < card.revertCount; i++) {
        events.push({
          turn: card.createdTurn + i + 1, // Approximate turn when revert happened
          cardId: card.id,
          from: card.currentColumn, // Simplified - actual from column not tracked
          to: card.currentColumn,   // Simplified - actual to column not tracked
          reason: 'TechnicalImpediment', // Default reason
          effortLost: 0 // TODO: Track actual effort lost
        });
      }
    });

    return events;
  }

  /**
   * Calculate trends based on historical data
   */
  private static calculateTrends(historicalMetrics: GameMetrics[]): MetricsResult['trends'] {
    if (historicalMetrics.length < 2) {
      return {
        velocityTrend: 'stable',
        cycleTimeTrend: 'stable',
        throughputTrend: 'stable'
      };
    }

    // Calculate velocity trend from velocityPerTurn arrays
    const recent = historicalMetrics.slice(-3);
    const older = historicalMetrics.slice(-6, -3);

    const getAvgVelocity = (metrics: GameMetrics[]) => {
      const velocities = metrics.flatMap(m => m.velocityPerTurn);
      return velocities.length > 0 ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length : 0;
    };

    const avgRecentVelocity = getAvgVelocity(recent);
    const avgOlderVelocity = older.length > 0 ? getAvgVelocity(older) : avgRecentVelocity;

    const velocityTrend = avgRecentVelocity > avgOlderVelocity * 1.1 ? 'increasing' :
                         avgRecentVelocity < avgOlderVelocity * 0.9 ? 'decreasing' : 'stable';

    // Similar logic for other metrics...
    return {
      velocityTrend,
      cycleTimeTrend: 'stable', // TODO: Implement cycle time trend analysis
      throughputTrend: 'stable' // TODO: Implement throughput trend analysis
    };
  }

  /**
   * Get all cards from all columns
   */
  private static getAllCards(gameState: GameState): Card[] {
    return Object.values(gameState.boardState.columns).flat();
  }

  /**
   * Get cards by effort size
   */
  static getCardsByEffort(cards: Card[], effort: CardEffort): Card[] {
    return cards.filter(card => card.effort === effort);
  }

  /**
   * Calculate effort distribution
   */
  static getEffortDistribution(cards: Card[]): Record<CardEffort, number> {
    const distribution: Record<CardEffort, number> = {
      1: 0, 3: 0, 5: 0
    };

    cards.forEach(card => {
      distribution[card.effort]++;
    });

    return distribution;
  }

  /**
   * Get current velocity (most recent turn's completed effort)
   */
  static getCurrentVelocity(gameState: GameState): number {
    const velocityPerTurn = this.calculateVelocityPerTurn(gameState);
    return velocityPerTurn.length > 0 ? velocityPerTurn[velocityPerTurn.length - 1] : 0;
  }

  /**
   * Get average velocity across all turns
   */
  static getAverageVelocity(gameState: GameState): number {
    const velocityPerTurn = this.calculateVelocityPerTurn(gameState);
    if (velocityPerTurn.length === 0) return 0;

    return velocityPerTurn.reduce((sum, velocity) => sum + velocity, 0) / velocityPerTurn.length;
  }
}
