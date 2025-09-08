import { BasePhaseHandler } from './base-handler';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  CommitmentMemoContent,
  SessionArtifact,
} from '../types';

export class CommitmentMemoHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'commitment_memo_generation';

  async processMessage(
    message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    const existingMemo = this.getArtifactContent(context, 'commitment_memo') as CommitmentMemoContent;
    const memo = this.generateCommitmentMemo(message, context, existingMemo);
    
    const validation = await this.validateReadiness(context);
    const responseContent = this.formatCommitmentMemo(memo, validation);
    
    const artifact: Partial<SessionArtifact> = {
      artifactType: 'commitment_memo',
      content: memo,
      phaseCreated: this.phase,
      version: existingMemo ? 2 : 1,
      isCurrent: true,
    };
    
    return this.createResponse(responseContent, {
      shouldTransition: validation.isValid,
      artifacts: [artifact],
      metadata: {
        sessionComplete: validation.isValid
      }
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    const memo = this.getArtifactContent(context, 'commitment_memo') as CommitmentMemoContent;
    
    const elements = [
      this.createElement('decision', this.isNonEmptyString(memo?.decision)),
      this.createElement('rationale', this.isNonEmptyString(memo?.rationale)),
      this.createElement('micro_bet', !!memo?.microBet),
      this.createElement('first_domino', !!memo?.firstDomino),
      this.createElement('success_metrics', this.isArrayWithContent(memo?.successMetrics)),
    ];
    
    const missingElements = elements
      .filter(e => e.required && !e.present)
      .map(e => e.name);
    
    return this.createValidationResult(
      missingElements.length === 0,
      elements,
      missingElements
    );
  }

  getNextPhase(_context: PhaseContext): PhoenixPhase | null {
    return null;
  }

  protected getPhaseKeywords(): string[] {
    return ['commit', 'decision', 'bet', 'action', 'metric', 'success', 'risk'];
  }

  private generateCommitmentMemo(
    _message: string,
    context: PhaseContext,
    existingMemo: CommitmentMemoContent | null
  ): CommitmentMemoContent {
    const applicationNotes = this.getArtifactContent(context, 'framework_application_notes');
    
    return existingMemo || {
      decision: applicationNotes?.decisions?.[0] || 'Proceed with the proposed solution',
      rationale: `Based on our analysis using First Principles and other frameworks, this decision addresses the core problem while managing identified risks.`,
      frameworksUsed: ['First Principles Thinking', 'OODA Loop', 'Eisenhower Matrix'],
      risks: [
        {
          description: 'Implementation challenges',
          probability: 'medium',
          impact: 'medium',
          mitigation: 'Start with small pilot to validate approach',
        }
      ],
      microBet: {
        description: 'Run a 2-week pilot with limited scope',
        cost: 'Minimal - uses existing resources',
        timeframe: '2 weeks',
        successCriteria: ['Positive feedback from initial users', 'Technical feasibility confirmed'],
      },
      firstDomino: {
        action: 'Schedule kickoff meeting with core team',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        responsible: 'Project lead',
        dependencies: ['Team availability', 'Resources allocated'],
      },
      successMetrics: [
        'User adoption rate > 50%',
        'Efficiency improvement > 20%',
        'Positive stakeholder feedback',
      ],
      reviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      stakeholderCommunication: 'Email update to all stakeholders within 24 hours',
    };
  }

  private formatCommitmentMemo(
    memo: CommitmentMemoContent,
    validation: ValidationResult
  ): string {
    if (!validation.isValid) {
      return `Let's finalize your commitment memo. I need a bit more information:

${validation.missingElements?.map(e => `- ${e.replace('_', ' ')}`).join('\n')}

This will complete your decision framework.`;
    }
    
    return `# COMMITMENT MEMO

## Decision
${memo.decision}

## Rationale
${memo.rationale}

## Frameworks Applied
${memo.frameworksUsed.map(f => `- ${f}`).join('\n')}

## Risk Assessment
${memo.risks.map(r => `- **${r.description}** (P: ${r.probability}, I: ${r.impact})\n  Mitigation: ${r.mitigation}`).join('\n')}

## Micro Bet
**What:** ${memo.microBet.description}
**Cost:** ${memo.microBet.cost}
**Timeline:** ${memo.microBet.timeframe}
**Success Criteria:**
${memo.microBet.successCriteria.map(c => `- ${c}`).join('\n')}

## First Domino
**Action:** ${memo.firstDomino.action}
**Deadline:** ${memo.firstDomino.deadline.toLocaleDateString()}
**Owner:** ${memo.firstDomino.responsible}

## Success Metrics
${memo.successMetrics.map(m => `- ${m}`).join('\n')}

## Review Date
${memo.reviewDate.toLocaleDateString()}

## Communication Plan
${memo.stakeholderCommunication}

---
*This commitment memo represents your decision after careful analysis using the Phoenix Framework. Execute the first domino action and monitor progress against your success metrics.*`;
  }
}