// Validation service - Capacity checks and rule enforcement
import { Card, BoardColumn, ScrumMasterState, GameState } from '../types/game';

export interface ValidationRequest {
  card?: Card;
  fromColumn?: BoardColumn;
  toColumn?: BoardColumn;
  gameState: GameState;
  scrumMasterState: ScrumMasterState;
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  blockingReason?: string;
}

export class ValidationService {
  // Column capacity limits (effort points)
  private static readonly COLUMN_CAPACITIES: Record<BoardColumn, number> = {
    Funnel: Infinity, // Unlimited
    ProductBacklog: Infinity, // Unlimited
    SprintBacklog: 20,
    Implementation: 13,
    Integration: 8,
    Testing: 8,
    PreDeployment: 5,
    Production: Infinity // Unlimited
  };

  /**
   * Validate if a card movement is allowed
   */
  static validateCardMovement(request: ValidationRequest): ValidationResult {
    const { card, toColumn, gameState } = request;

    if (!card || !toColumn) {
      return {
        isValid: false,
        message: 'Card and target column are required'
      };
    }

    // Check column capacity
    const capacityCheck = this.checkColumnCapacity(toColumn, card, gameState);
    if (!capacityCheck.isValid) {
      return capacityCheck;
    }

    // Check workflow rules
    const workflowCheck = this.checkWorkflowRules(card, toColumn);
    if (!workflowCheck.isValid) {
      return workflowCheck;
    }

    return {
      isValid: true,
      message: 'Movement is valid'
    };
  }

  /**
   * Check if a column has capacity for the card
   */
  static checkColumnCapacity(column: BoardColumn, card: Card, gameState: GameState): ValidationResult {
    const maxCapacity = this.COLUMN_CAPACITIES[column];

    if (maxCapacity === Infinity) {
      return { isValid: true, message: 'Column has unlimited capacity' };
    }

    const cardsInColumn = gameState.boardState.columns[column] || [];
    const currentCapacity = cardsInColumn.reduce((sum: number, c: Card) => sum + c.effort, 0);
    const newCapacity = currentCapacity + card.effort;

    if (newCapacity > maxCapacity) {
      return {
        isValid: false,
        message: `Column ${column} would exceed capacity (${newCapacity}/${maxCapacity})`,
        blockingReason: 'capacity_exceeded'
      };
    }

    return {
      isValid: true,
      message: `Column has capacity (${newCapacity}/${maxCapacity})`
    };
  }

  /**
   * Check workflow rules for card movement
   */
  static checkWorkflowRules(card: Card, toColumn: BoardColumn): ValidationResult {
    // Cards can move to any column (reverts and advances are handled by game logic)
    // Additional workflow rules can be added here if needed

    return {
      isValid: true,
      message: 'Workflow rules allow this movement'
    };
  }

  /**
   * Validate sprint planning (pulling cards to sprint backlog)
   */
  static validateSprintPlanning(cardIds: string[], gameState: GameState): ValidationResult {
    const sprintBacklogCapacity = this.COLUMN_CAPACITIES.SprintBacklog;
    const currentSprintCards = gameState.boardState.columns.SprintBacklog || [];
    const currentCapacity = currentSprintCards.reduce((sum: number, c: Card) => sum + c.effort, 0);

    // Find the requested cards
    const requestedCards = gameState.boardState.columns.ProductBacklog?.filter((card: Card) =>
      cardIds.includes(card.id)
    ) || [];

    if (requestedCards.length !== cardIds.length) {
      return {
        isValid: false,
        message: 'Some requested cards not found in Product Backlog',
        blockingReason: 'cards_not_found'
      };
    }

    const requestedCapacity = requestedCards.reduce((sum: number, c: Card) => sum + c.effort, 0);
    const newCapacity = currentCapacity + requestedCapacity;

    if (newCapacity > sprintBacklogCapacity) {
      return {
        isValid: false,
        message: `Sprint Backlog would exceed capacity (${newCapacity}/${sprintBacklogCapacity})`,
        blockingReason: 'sprint_capacity_exceeded'
      };
    }

    return {
      isValid: true,
      message: `Sprint planning valid (${newCapacity}/${sprintBacklogCapacity})`
    };
  }

  /**
   * Validate capacity allocation for a turn
   */
  static validateCapacityAllocation(
    allocations: Record<BoardColumn, number>,
    scrumMasterState: ScrumMasterState
  ): ValidationResult {
    // TODO: Implement capacity allocation validation based on game rules
    // This would check if the allocated capacity makes sense given team composition, etc.

    return {
      isValid: true,
      message: 'Capacity allocation is valid'
    };
  }

  /**
   * Check if a column is blocked due to capacity
   */
  static isColumnBlocked(column: BoardColumn, gameState: GameState): boolean {
    const maxCapacity = this.COLUMN_CAPACITIES[column];

    if (maxCapacity === Infinity) {
      return false;
    }

    const cardsInColumn = gameState.boardState.columns[column] || [];
    const currentCapacity = cardsInColumn.reduce((sum: number, c: Card) => sum + c.effort, 0);

    return currentCapacity >= maxCapacity;
  }

  /**
   * Get available capacity for a column
   */
  static getAvailableCapacity(column: BoardColumn, gameState: GameState): number {
    const maxCapacity = this.COLUMN_CAPACITIES[column];

    if (maxCapacity === Infinity) {
      return Infinity;
    }

    const cardsInColumn = gameState.boardState.columns[column] || [];
    const currentCapacity = cardsInColumn.reduce((sum: number, c: Card) => sum + c.effort, 0);

    return Math.max(0, maxCapacity - currentCapacity);
  }

  /**
   * Validate that a card exists and is in the expected state
   */
  static validateCardExists(cardId: string, gameState: GameState): ValidationResult {
    // Search all columns for the card
    for (const column of Object.values(gameState.boardState.columns) as Card[][]) {
      const card = column.find((c: Card) => c.id === cardId);
      if (card) {
        return {
          isValid: true,
          message: `Card ${cardId} found in ${card.currentColumn}`
        };
      }
    }

    return {
      isValid: false,
      message: `Card ${cardId} not found`,
      blockingReason: 'card_not_found'
    };
  }
}