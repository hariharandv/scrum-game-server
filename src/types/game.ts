/**
 * Core Game Type Definitions
 * Used by both frontend and backend
 * Location: shared/types/game.ts
 */

// ============================================================================
// CARD TYPES
// ============================================================================

export type CardEffort = 1 | 3 | 5;

export type BoardColumn = 
  | 'Funnel'
  | 'ProductBacklog'
  | 'SprintBacklog'
  | 'Implementation'
  | 'Integration'
  | 'Testing'
  | 'PreDeployment'
  | 'Production';

export const BOARD_COLUMNS: BoardColumn[] = [
  'Funnel',
  'ProductBacklog',
  'SprintBacklog',
  'Implementation',
  'Integration',
  'Testing',
  'PreDeployment',
  'Production'
];

export interface Card {
  id: string;
  title: string;
  description?: string;
  effort: CardEffort;
  status: BoardColumn;
  createdTurn: number;
  revertCount: number;
  currentColumn: BoardColumn;
  assignedTo?: PlayerRole;
  isTechnicalDebt: boolean;
  cycleTime: number | null;
}

// ============================================================================
// GAME PHASE & STATE TYPES
// ============================================================================

export type GamePhase = 
  | 'SprintPlanning'
  | 'Execution'
  | 'SprintReview'
  | 'Retrospective';

export const GAME_PHASES: GamePhase[] = [
  'SprintPlanning',
  'Execution',
  'SprintReview',
  'Retrospective'
];

export interface BoardState {
  columns: Record<BoardColumn, Card[]>;
  currentTurn: number;
  currentPhase: GamePhase;
  teamCapacity: number;
  usedCapacity: number;
  allocations: Record<CardEffort, number>;
  metrics: GameMetrics;
}

export interface GameState {
  id: string;
  boardState: BoardState;
  players: Player[];
  scrumMasterState: ScrumMasterState;
  maxTurns: number;
  startedAt: Date;
  currentPlayerTurn: PlayerRole;
}

// ============================================================================
// PLAYER & ROLE TYPES
// ============================================================================

export type PlayerRole = 
  | 'Stakeholder'
  | 'ProductOwner'
  | 'ScrumMaster'
  | 'Developer-Impl'
  | 'Developer-Intg'
  | 'QATester'
  | 'ReleaseManager'
  | 'Customer';

export const PLAYER_ROLES: PlayerRole[] = [
  'Stakeholder',
  'ProductOwner',
  'ScrumMaster',
  'Developer-Impl',
  'Developer-Intg',
  'QATester',
  'ReleaseManager',
  'Customer'
];

export const ROLE_TO_COLUMN: Record<PlayerRole, BoardColumn> = {
  'Stakeholder': 'Funnel',
  'ProductOwner': 'ProductBacklog',
  'ScrumMaster': 'SprintBacklog',
  'Developer-Impl': 'Implementation',
  'Developer-Intg': 'Integration',
  'QATester': 'Testing',
  'ReleaseManager': 'PreDeployment',
  'Customer': 'Production'
};

export interface Player {
  id: string;
  role: PlayerRole;
  name: string;
  actionCount: number;
  lastAction?: string;
}

export interface ScrumMasterState {
  tokensAvailable: number;
  tokensTotal: number; // Usually 3
  tokensUsed: number;
  technicalDebtActive: boolean;
  technicalDebtExpiresAtTurn: number;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface GameMetrics {
  velocityPerTurn: number[];
  accumulatedScore: number;
  cycleTimePerCard: Map<string, number>;
  cumulativeFlowData: CFDSnapshot[];
  revertEvents: RevertEvent[];
  tokenUsageHistory: TokenEvent[];
}

export interface CFDSnapshot {
  turn: number;
  columnCounts: Record<BoardColumn, number>;
  totalWIP: number;
}

export interface RevertEvent {
  turn: number;
  cardId: string;
  from: BoardColumn;
  to: BoardColumn;
  reason: 'ScopeCreep' | 'TechnicalImpediment' | 'CriticalFailure' | 'POReject';
  effortLost: number;
}

export interface TokenEvent {
  turn: number;
  cardId: string;
  tokensConsumed: number;
  mitigatedFrom: BoardColumn;
  mitigatedTo: BoardColumn;
}

// ============================================================================
// D6 ROLL TYPES
// ============================================================================

export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface D6RollRequest {
  cardId: string;
  currentColumn: BoardColumn;
}

export interface D6RollResult {
  rollValue: DiceValue;
  destinationColumn: BoardColumn;
  cardMovement: CardMovement;
  effectDescription: string;
  canMitigation: boolean;
}

export interface CardMovement {
  from: BoardColumn;
  to: BoardColumn;
  effortApplied: number;
  causesRevert: boolean;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export type GameAction = 
  | { type: 'PULL_TO_SPRINT_BACKLOG'; payload: { cardIds: string[] } }
  | { type: 'ALLOCATE_CAPACITY'; payload: { cardId: string; effort: CardEffort } }
  | { type: 'ROLL_D6'; payload: { cardId: string } }
  | { type: 'USE_IMPEDIMENT_TOKEN'; payload: { cardId: string } }
  | { type: 'ALLOCATE_TECHNICAL_DEBT'; payload: { effort: CardEffort } }
  | { type: 'ACCEPT_CARD'; payload: { cardId: string } }
  | { type: 'REJECT_CARD'; payload: { cardId: string } }
  | { type: 'ADVANCE_PHASE'; payload: {} }
  | { type: 'ADVANCE_TURN'; payload: {} };

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  event?: GameEvent;
}

export interface GameEvent {
  id: string;
  turn: number;
  phase: GamePhase;
  timestamp: Date;
  actor: PlayerRole;
  action: string;
  details: Record<string, any>;
}

// ============================================================================
// RETROSPECTIVE TYPES
// ============================================================================

export interface RetrospectiveData {
  turn: number;
  cfdChart: CFDSnapshot[];
  velocityTrend: number[];
  accumulatedScore: number;
  bottlenecks: Bottleneck[];
  revertAnalysis: RevertAnalysis;
  topInsights: string[];
}

export interface Bottleneck {
  column: BoardColumn;
  growthRate: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendation?: string;
}

export interface RevertAnalysis {
  totalReverts: number;
  byReason: Record<string, number>;
  mostCommonFailure: string;
  averageRevertCount: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface GameStateResponse extends APIResponse<GameState> {}

export interface D6RollResponse extends APIResponse<D6RollResult> {}

export interface ActionResponse extends APIResponse<ActionResult> {}
