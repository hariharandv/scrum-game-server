// Board service - Manages card movement and column transitions
import { Card, BoardColumn, ScrumMasterState, D6RollResult } from '../types/game';

export interface CardMovementRequest {
  card: Card;
  fromColumn: BoardColumn;
  toColumn: BoardColumn;
  rollResult: D6RollResult;
  scrumMasterState: ScrumMasterState;
}

export interface CardMovementResult {
  success: boolean;
  card: Card;
  fromColumn: BoardColumn;
  toColumn: BoardColumn;
  message: string;
  tokensUsed?: number;
  technicalDebtActivated?: boolean;
}

export class BoardService {
  private static readonly COLUMNS: BoardColumn[] = [
    'Funnel',
    'ProductBacklog',
    'SprintBacklog',
    'Implementation',
    'Integration',
    'Testing',
    'PreDeployment',
    'Production'
  ];

  /**
   * Move a card between columns based on D6 roll result
   */
  static moveCard(request: CardMovementRequest): CardMovementResult {
    const { card, fromColumn, toColumn, rollResult, scrumMasterState } = request;

    // Validate the movement
    if (!this.isValidMovement(fromColumn, toColumn)) {
      return {
        success: false,
        card,
        fromColumn,
        toColumn,
        message: `Invalid movement from ${fromColumn} to ${toColumn}`
      };
    }

    // Check capacity constraints
    if (!this.canAcceptCard(toColumn, card)) {
      return {
        success: false,
        card,
        fromColumn,
        toColumn,
        message: `Column ${toColumn} is at capacity`
      };
    }

    // Apply the movement
    const updatedCard = this.applyMovement(card, toColumn, rollResult);

    // Handle token usage if applicable
    let tokensUsed = 0;
    let technicalDebtActivated = false;

    // TODO: Handle mitigation logic based on rollResult.canMitigation
    // For now, no tokens used or technical debt activated

    return {
      success: true,
      card: updatedCard,
      fromColumn,
      toColumn,
      message: `Card moved from ${fromColumn} to ${toColumn}`,
      tokensUsed,
      technicalDebtActivated
    };
  }

  /**
   * Get the next column in the workflow
   */
  static getNextColumn(currentColumn: BoardColumn): BoardColumn | null {
    const currentIndex = this.COLUMNS.indexOf(currentColumn);
    if (currentIndex === -1 || currentIndex === this.COLUMNS.length - 1) {
      return null;
    }
    return this.COLUMNS[currentIndex + 1];
  }

  /**
   * Get the previous column in the workflow
   */
  static getPreviousColumn(currentColumn: BoardColumn): BoardColumn | null {
    const currentIndex = this.COLUMNS.indexOf(currentColumn);
    if (currentIndex <= 0) {
      return null;
    }
    return this.COLUMNS[currentIndex - 1];
  }

  /**
   * Get multiple previous columns (for reverts)
   */
  static getPreviousColumns(currentColumn: BoardColumn, steps: number): BoardColumn[] {
    const currentIndex = this.COLUMNS.indexOf(currentColumn);
    const result: BoardColumn[] = [];

    for (let i = 1; i <= steps && currentIndex - i >= 0; i++) {
      result.push(this.COLUMNS[currentIndex - i]);
    }

    return result;
  }

  /**
   * Validate if a movement between columns is allowed
   */
  private static isValidMovement(from: BoardColumn, to: BoardColumn): boolean {
    // Allow movement to any column (reverts and advances are handled by game logic)
    return true;
  }

  /**
   * Check if a column can accept a new card based on capacity rules
   */
  private static canAcceptCard(column: BoardColumn, card: Card): boolean {
    // TODO: Implement capacity validation based on game rules
    // For now, allow all movements
    return true;
  }

  /**
   * Apply movement effects to the card
   */
  private static applyMovement(card: Card, toColumn: BoardColumn, rollResult: D6RollResult): Card {
    const updatedCard: Card = {
      ...card,
      currentColumn: toColumn,
      status: toColumn
    };

    // Update cycle time if moving to Production (equivalent to Done)
    if (toColumn === 'Production' && card.cycleTime === null) {
      // TODO: Calculate actual cycle time based on current turn
      updatedCard.cycleTime = 1; // Placeholder
    }

    // Track reverts
    if (rollResult.cardMovement.causesRevert) {
      updatedCard.revertCount += 1;
    }

    return updatedCard;
  }

  /**
   * Get all cards in a specific column
   */
  static getCardsInColumn(cards: Card[], column: BoardColumn): Card[] {
    return cards.filter(card => card.currentColumn === column);
  }

  /**
   * Calculate column capacity utilization
   */
  static getColumnCapacity(cards: Card[], column: BoardColumn): { current: number; max: number } {
    const cardsInColumn = this.getCardsInColumn(cards, column);
    const currentCapacity = cardsInColumn.reduce((sum, card) => sum + card.effort, 0);

    // TODO: Define actual capacity limits per column
    const maxCapacity = this.getMaxCapacityForColumn(column);

    return { current: currentCapacity, max: maxCapacity };
  }

  /**
   * Get maximum capacity for a column
   */
  private static getMaxCapacityForColumn(column: BoardColumn): number {
    // TODO: Implement actual capacity rules based on game mechanics
    // These are placeholder values
    const capacityMap: Record<BoardColumn, number> = {
      Funnel: 50, // Unlimited for funnel
      ProductBacklog: 50, // Unlimited for backlog
      SprintBacklog: 20,
      Implementation: 13,
      Integration: 8,
      Testing: 8,
      PreDeployment: 5,
      Production: 50 // Unlimited for production
    };

    return capacityMap[column] || 0;
  }
}

// Legacy service interface for backward compatibility
export const boardService = {
  getBoardState: async () => {
    // TODO: Return current board state
    return { columns: {}, cards: [] };
  },

  moveCard: async (cardId: string, fromColumn: string, toColumn: string) => {
    // TODO: Move card between columns
    return { cardId, fromColumn, toColumn, success: true, message: 'Card moved successfully' };
  },

  pullToSprint: async (cardIds: string[]) => {
    // TODO: Pull cards to sprint backlog
    return { pulledCards: cardIds, success: true, message: 'Cards pulled to sprint successfully' };
  },

  allocateCapacity: async (allocations: any) => {
    // TODO: Allocate capacity to features/TD
    return { allocations, success: true, message: 'Capacity allocated successfully' };
  }
};