import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  FrameworkSelection,
} from '../types';

export class FrameworkSelectionHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'framework_selection';

  async processMessage(
    _message: string,
    _context: PhaseContext
  ): Promise<PhaseResponse> {
    const mockFrameworks = this.getMockFrameworks();
    
    const responseContent = `Based on your problem, I've selected these frameworks to guide your decision:

**1. First Principles Thinking**
- Break down the problem to fundamental truths
- Relevance: High - helps clarify core assumptions

**2. OODA Loop (Observe-Orient-Decide-Act)**
- Rapid decision-making framework
- Relevance: High - matches your urgency level

**3. Eisenhower Matrix**
- Prioritization based on urgency/importance
- Relevance: Medium - helps focus on what matters

These frameworks will help structure your thinking. Let's apply them to your specific situation.`;
    
    return this.createResponse(responseContent, {
      shouldTransition: true,
      nextPhase: 'framework_application',
      frameworkSelections: mockFrameworks,
    });
  }

  async validateReadiness(_context: PhaseContext): Promise<ValidationResult> {
    const elements = [
      this.createElement('frameworks_selected', true),
      this.createElement('relevance_scores', true),
    ];
    
    return this.createValidationResult(true, elements);
  }

  getNextPhase(_context: PhaseContext): PhoenixPhase | null {
    return 'framework_application';
  }

  protected getPhaseKeywords(): string[] {
    return ['framework', 'model', 'approach', 'method', 'tool'];
  }

  private getMockFrameworks(): Partial<FrameworkSelection>[] {
    return [
      {
        knowledgeContentId: 'mock-1',
        relevanceScore: 0.85,
        scoreBreakdown: {
          directRelevance: 0.9,
          applicabilityNow: 0.8,
          foundationalValue: 0.85,
          simplicityBonus: 0.1,
          personalRelevance: 0.8,
          complementarity: 0.9,
          overallScore: 0.85,
          reasoning: 'Highly relevant to breaking down complex problems',
        },
        selectionRank: 1,
        selectionReason: 'Core framework for understanding fundamentals',
        wasApplied: false,
      },
      {
        knowledgeContentId: 'mock-2',
        relevanceScore: 0.82,
        scoreBreakdown: {
          directRelevance: 0.85,
          applicabilityNow: 0.9,
          foundationalValue: 0.7,
          simplicityBonus: 0.15,
          personalRelevance: 0.75,
          complementarity: 0.85,
          overallScore: 0.82,
          reasoning: 'Excellent for rapid decision-making under time pressure',
        },
        selectionRank: 2,
        selectionReason: 'Matches urgency requirements',
        wasApplied: false,
      },
    ];
  }
}