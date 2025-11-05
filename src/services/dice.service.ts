import {
  DiceValue,
  BoardColumn,
  D6RollResult,
  CardMovement,
  ScrumMasterState,
  Card
} from '../types/game';

// ============================================================================
// DICE SERVICE - Core Game Engine
// ============================================================================

export interface D6RollRequest {
  cardId: string;
  currentColumn: BoardColumn;
  card: Card;
  scrumMasterState: ScrumMasterState;
}

export class DiceService {
  /**
   * Roll a D6 for a card and determine the outcome
   */
  static rollD6(request: D6RollRequest): D6RollResult {
    const roll = this.generateRoll();
    const { card, currentColumn, scrumMasterState } = request;

    switch (roll) {
      case 1:
        return this.handleCriticalSuccess(card, currentColumn);
      case 2:
      case 3:
        return this.handleStandardProgress(card, currentColumn, roll);
      case 4:
        return this.handleScopeCreep(card, currentColumn);
      case 5:
        return this.handleTechnicalImpediment(card, currentColumn, scrumMasterState);
      case 6:
        return this.handleCriticalFailure(card, currentColumn, scrumMasterState);
      default:
        throw new Error(`Invalid roll value: ${roll}`);
    }
  }

  /**
   * Generate a random D6 roll (1-6)
   */
  private static generateRoll(): DiceValue {
    return (Math.floor(Math.random() * 6) + 1) as DiceValue;
  }

  /**
   * Get the next column in the workflow
   */
  private static getNextColumn(column: BoardColumn): BoardColumn {
    const columns: BoardColumn[] = [
      'Funnel',
      'ProductBacklog',
      'SprintBacklog',
      'Implementation',
      'Integration',
      'Testing',
      'PreDeployment',
      'Production'
    ];

    const currentIndex = columns.indexOf(column);
    if (currentIndex === -1 || currentIndex === columns.length - 1) {
      return column; // Stay in same column if at end
    }

    return columns[currentIndex + 1];
  }

  /**
   * Get the previous column in the workflow
   */
  private static getPreviousColumn(column: BoardColumn): BoardColumn {
    const columns: BoardColumn[] = [
      'Funnel',
      'ProductBacklog',
      'SprintBacklog',
      'Implementation',
      'Integration',
      'Testing',
      'PreDeployment',
      'Production'
    ];

    const currentIndex = columns.indexOf(column);
    if (currentIndex <= 0) {
      return column; // Stay in same column if at beginning
    }

    return columns[currentIndex - 1];
  }

  // ============================================================================
  // ROLL OUTCOME HANDLERS
  // ============================================================================

  /**
   * Roll = 1: Critical Success
   * Card bypasses all remaining stages and goes directly to Production
   */
  private static handleCriticalSuccess(card: Card, currentColumn: BoardColumn): D6RollResult {
    const cardMovement: CardMovement = {
      from: currentColumn,
      to: 'Production',
      effortApplied: card.effort,
      causesRevert: false
    };

    return {
      rollValue: 1,
      destinationColumn: 'Production',
      cardMovement,
      effectDescription: 'Expedited Deployment! Card bypasses all remaining stages.',
      canMitigation: false
    };
  }

  /**
   * Roll = 2-3: Standard Progress
   * Card moves to the next column in the workflow
   */
  private static handleStandardProgress(card: Card, currentColumn: BoardColumn, roll: 2 | 3): D6RollResult {
    const nextColumn = this.getNextColumn(currentColumn);

    const cardMovement: CardMovement = {
      from: currentColumn,
      to: nextColumn,
      effortApplied: card.effort,
      causesRevert: false
    };

    return {
      rollValue: roll,
      destinationColumn: nextColumn,
      cardMovement,
      effectDescription: 'Low friction. Card progresses to next stage.',
      canMitigation: false
    };
  }

  /**
   * Roll = 4: Scope Creep
   * Card reverts to Product Backlog for re-sizing
   */
  private static handleScopeCreep(card: Card, currentColumn: BoardColumn): D6RollResult {
    const cardMovement: CardMovement = {
      from: currentColumn,
      to: 'ProductBacklog',
      effortApplied: 0, // Effort lost due to revert
      causesRevert: true
    };

    return {
      rollValue: 4,
      destinationColumn: 'ProductBacklog',
      cardMovement,
      effectDescription: 'Scope Creep detected! Card reverts to Product Backlog for re-sizing.',
      canMitigation: false
    };
  }

  /**
   * Roll = 5: Technical Impediment
   * Card reverts, but can be mitigated with SM token
   */
  private static handleTechnicalImpediment(
    card: Card,
    currentColumn: BoardColumn,
    scrumMasterState: ScrumMasterState
  ): D6RollResult {
    const canUseMitigation = scrumMasterState.tokensAvailable > 0;
    const targetColumn = canUseMitigation
      ? this.getPreviousColumn(currentColumn)
      : 'Implementation';

    const cardMovement: CardMovement = {
      from: currentColumn,
      to: targetColumn,
      effortApplied: 0, // Effort lost due to revert
      causesRevert: true
    };

    return {
      rollValue: 5,
      destinationColumn: targetColumn,
      cardMovement,
      effectDescription: 'Technical Impediment/Dependency blocked work. Revert for unblocking.',
      canMitigation: canUseMitigation
    };
  }

  /**
   * Roll = 6: Critical Failure
   * Severe setback, can be mitigated by active Technical Debt
   */
  private static handleCriticalFailure(
    card: Card,
    currentColumn: BoardColumn,
    scrumMasterState: ScrumMasterState
  ): D6RollResult {
    // Check if Technical Debt bonus is active
    const tdBonus = scrumMasterState.technicalDebtActive &&
      scrumMasterState.technicalDebtExpiresAtTurn > 0; // TODO: Compare with current turn

    const targetColumn = tdBonus ? 'Implementation' : 'SprintBacklog';

    const cardMovement: CardMovement = {
      from: currentColumn,
      to: targetColumn,
      effortApplied: 0, // Effort lost due to revert
      causesRevert: true
    };

    const effectDescription = tdBonus
      ? 'Critical Failure mitigated by Technical Debt! Revert to Implementation.'
      : 'Critical Failure! Severe setback requiring re-estimation.';

    return {
      rollValue: 6,
      destinationColumn: targetColumn,
      cardMovement,
      effectDescription,
      canMitigation: false // No token mitigation for roll=6
    };
  }
}