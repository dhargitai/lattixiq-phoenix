import { BasePhaseHandler } from './base-handler';
import { FrameworkSelector } from '../services/framework-selector';
import type {
  PhoenixPhase,
  PhaseContext,
  PhaseResponse,
  ValidationResult,
  FrameworkSelection,
  ProblemBriefContent,
} from '../types';

export class FrameworkSelectionHandler extends BasePhaseHandler {
  readonly phase: PhoenixPhase = 'framework_selection';
  private frameworkSelector: FrameworkSelector;

  constructor() {
    super();
    this.frameworkSelector = new FrameworkSelector();
  }

  async processMessage(
    _message: string,
    context: PhaseContext
  ): Promise<PhaseResponse> {
    // Get the problem brief from session artifacts
    const problemBrief = this.getArtifactContent(context, 'problem_brief') as ProblemBriefContent;
    if (!problemBrief || !problemBrief.problemStatement) {
      throw new Error('Problem brief is required for framework selection');
    }

    // Generate problem statement for framework selection
    const problemStatement = this.generateProblemStatement(problemBrief);
    
    // Select frameworks automatically using the service
    const selectedFrameworks = await this.frameworkSelector.selectFrameworks(
      problemStatement,
      context.sessionId,
      {
        maxFrameworks: 3, // Limit to 3 frameworks for focused guidance
        targetPersona: problemBrief.targetPersona ? [problemBrief.targetPersona] : ['founder'],
        startupPhase: problemBrief.startupPhase ? [problemBrief.startupPhase] : ['seed'],
        includeSuperModels: true,
      }
    );

    // Generate response content based on selected frameworks
    const responseContent = this.generateFrameworksResponse(selectedFrameworks);
    
    return this.createResponse(responseContent, {
      shouldTransition: true,
      nextPhase: 'framework_application',
      frameworkSelections: selectedFrameworks,
    });
  }

  async validateReadiness(context: PhaseContext): Promise<ValidationResult> {
    // Check if frameworks have been selected and stored
    const frameworkSelections = context.phaseData?.frameworkSelections as FrameworkSelection[] || [];
    
    const elements = [
      this.createElement('frameworks_selected', frameworkSelections.length > 0),
      this.createElement('relevance_scores', frameworkSelections.every(f => f.relevanceScore > 0)),
    ];
    
    return this.createValidationResult(frameworkSelections.length > 0, elements);
  }

  async getNextPhase(_context: PhaseContext): Promise<PhoenixPhase | null> {
    return 'framework_application';
  }

  protected getPhaseKeywords(): string[] {
    return ['framework', 'model', 'approach', 'method', 'tool'];
  }

  /**
   * Generate a comprehensive problem statement from the problem brief
   */
  private generateProblemStatement(problemBrief: ProblemBriefContent): string {
    let statement = problemBrief.problemStatement;
    
    if (problemBrief.context) {
      statement += ` Context: ${problemBrief.context}`;
    }
    
    if (problemBrief.constraints && problemBrief.constraints.length > 0) {
      statement += ` Constraints: ${problemBrief.constraints.join(', ')}`;
    }
    
    if (problemBrief.urgencyLevel) {
      statement += ` Urgency: ${problemBrief.urgencyLevel}`;
    }
    
    return statement;
  }

  /**
   * Generate response content based on selected frameworks
   */
  private generateFrameworksResponse(frameworks: FrameworkSelection[]): string {
    if (frameworks.length === 0) {
      return "I'm analyzing your problem to select the most relevant frameworks. Let me find the best approaches for your specific situation.";
    }

    let response = "Based on your problem, I've selected these frameworks to guide your decision:\n\n";
    
    frameworks.forEach((framework, index) => {
      response += `**${index + 1}. ${framework.title || 'Framework'}**\n`;
      response += `- ${framework.selectionReason}\n`;
      response += `- Relevance: ${this.formatRelevanceScore(framework.relevanceScore)}\n`;
      if (framework.scoreBreakdown?.reasoning) {
        response += `- ${framework.scoreBreakdown.reasoning}\n`;
      }
      response += "\n";
    });

    response += "These frameworks complement each other and will help structure your thinking. Let's apply them to your specific situation step by step.";
    
    return response;
  }

  /**
   * Format relevance score for display
   */
  private formatRelevanceScore(score: number): string {
    if (score >= 0.8) return "Very High";
    if (score >= 0.7) return "High";
    if (score >= 0.6) return "Medium";
    return "Moderate";
  }
}