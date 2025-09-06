export { BasePhaseHandler } from './base-handler';
export { ProblemIntakeHandler } from './problem-intake-handler';
export { DiagnosticInterviewHandler } from './diagnostic-interview-handler';
export { TypeClassificationHandler } from './type-classification-handler';
export { FrameworkSelectionHandler } from './framework-selection-handler';
export { FrameworkApplicationHandler } from './framework-application-handler';
export { CommitmentMemoHandler } from './commitment-memo-handler';

import type { PhoenixPhase, PhaseHandler } from '../types';
import { ProblemIntakeHandler } from './problem-intake-handler';
import { DiagnosticInterviewHandler } from './diagnostic-interview-handler';
import { TypeClassificationHandler } from './type-classification-handler';
import { FrameworkSelectionHandler } from './framework-selection-handler';
import { FrameworkApplicationHandler } from './framework-application-handler';
import { CommitmentMemoHandler } from './commitment-memo-handler';

export function createPhaseHandler(phase: PhoenixPhase): PhaseHandler {
  switch (phase) {
    case 'problem_intake':
      return new ProblemIntakeHandler();
    case 'diagnostic_interview':
      return new DiagnosticInterviewHandler();
    case 'type_classification':
      return new TypeClassificationHandler();
    case 'framework_selection':
      return new FrameworkSelectionHandler();
    case 'framework_application':
      return new FrameworkApplicationHandler();
    case 'commitment_memo_generation':
      return new CommitmentMemoHandler();
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

export class PhaseHandlerRegistry {
  private handlers: Map<PhoenixPhase, PhaseHandler>;

  constructor() {
    this.handlers = new Map();
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.handlers.set('problem_intake', new ProblemIntakeHandler());
    this.handlers.set('diagnostic_interview', new DiagnosticInterviewHandler());
    this.handlers.set('type_classification', new TypeClassificationHandler());
    this.handlers.set('framework_selection', new FrameworkSelectionHandler());
    this.handlers.set('framework_application', new FrameworkApplicationHandler());
    this.handlers.set('commitment_memo_generation', new CommitmentMemoHandler());
  }

  getHandler(phase: PhoenixPhase): PhaseHandler | undefined {
    return this.handlers.get(phase);
  }

  registerHandler(phase: PhoenixPhase, handler: PhaseHandler): void {
    this.handlers.set(phase, handler);
  }
}