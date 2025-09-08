/**
 * Tests for ProblemIntakeHandler - First phase of Phoenix Framework
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProblemIntakeHandler } from './problem-intake-handler';
import type { PhaseContext, ProblemBriefContent } from '../types';

describe('ProblemIntakeHandler', () => {
  let handler: ProblemIntakeHandler;

  beforeEach(() => {
    handler = new ProblemIntakeHandler();
  });

  describe('Basic Properties', () => {
    it('should have correct phase identifier', () => {
      expect(handler.phase).toBe('problem_intake');
    });

    it('should return correct phase keywords', () => {
      const keywords = handler['getPhaseKeywords']();
      
      expect(keywords).toContain('problem');
      expect(keywords).toContain('decision');
      expect(keywords).toContain('issue');
      expect(keywords).toContain('challenge');
      expect(keywords).toContain('situation');
    });
  });

  describe('processMessage', () => {
    const basicContext: PhaseContext = {
      sessionId: 'test-session',
      userId: 'test-user',
      currentPhase: 'problem_intake',
      phaseState: { step: 'initial' },
      messages: [],
      artifacts: [],
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should provide initial greeting for first message', async () => {
      const firstMessage = "I need help with a decision";
      
      const response = await handler.processMessage(firstMessage, basicContext);

      expect(response.content).toContain('Phoenix Framework');
      expect(response.content).toContain('decision sprint');
      expect(response.content).toContain('problem statement');
      expect(response.shouldTransition).toBe(false);
      expect(response.nextPhase).toBeNull();
    });

    it('should guide user through problem statement development', async () => {
      const contextWithMessages: PhaseContext = {
        ...basicContext,
        messages: [
          { role: 'user', content: 'I need help with a decision' },
          { role: 'assistant', content: 'Welcome to Phoenix Framework...' },
        ],
      };

      const userMessage = "I'm thinking about pivoting my startup";
      
      const response = await handler.processMessage(userMessage, contextWithMessages);

      expect(response.content).toContain('more specific');
      expect(response.content.toLowerCase()).toContain('context');
      expect(response.shouldTransition).toBe(false);
    });

    it('should ask clarifying questions for vague problems', async () => {
      const vagueProblem = "I don't know what to do";
      
      const response = await handler.processMessage(vagueProblem, basicContext);

      expect(response.content).toContain('?');
      expect(response.content.toLowerCase()).toContain('specific');
      expect(response.shouldTransition).toBe(false);
    });

    it('should identify when problem statement is complete', async () => {
      const contextWithProgress: PhaseContext = {
        ...basicContext,
        phaseState: { step: 'refining', statementDrafts: 2 },
        messages: [
          { role: 'user', content: 'I need help with a decision' },
          { role: 'assistant', content: 'Tell me more...' },
          { role: 'user', content: 'Should I pivot my SaaS startup from B2B to B2C, given declining enterprise sales?' },
        ],
      };

      const wellDefinedMessage = "My enterprise clients are churning at 15% monthly, but I see strong consumer demand signals";
      
      const response = await handler.processMessage(wellDefinedMessage, contextWithProgress);

      expect(response.shouldTransition).toBe(true);
      expect(response.nextPhase).toBe('diagnostic_interview');
      expect(response.artifacts).toBeDefined();
      expect(response.artifacts?.[0]?.artifactType).toBe('problem_brief');
    });

    it('should extract key elements from problem description', async () => {
      const contextWithMessages: PhaseContext = {
        ...basicContext,
        phaseState: { step: 'gathering', stakeholdersIdentified: 1 },
        messages: [
          { role: 'user', content: 'Previous context...' },
        ],
      };

      const detailedProblem = `I run a 50-person startup selling B2B software. 
        Our enterprise sales are declining 15% monthly, but consumer interest is growing. 
        My investors want results in 6 months, and my team is divided on pivoting to B2C. 
        Success means achieving product-market fit and positive unit economics.`;
      
      const response = await handler.processMessage(detailedProblem, contextWithMessages);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        
        expect(content.stakeholders).toContain('investors');
        expect(content.stakeholders).toContain('team');
        expect(content.constraints).toContain('6 months');
        expect(content.successCriteria).toContain('product-market fit');
        expect(content.urgency).toBe('high');
        expect(content.complexity).toBe('complex');
      }
    });

    it('should handle business vs personal decision classification', async () => {
      const businessDecision = "Should I hire 10 more engineers or focus on sales?";
      
      const response = await handler.processMessage(businessDecision, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.decisionType).toBe('1'); // Business decision
      }
    });

    it('should classify decision urgency correctly', async () => {
      const urgentProblem = "I have 48 hours to decide whether to accept this acquisition offer";
      
      const response = await handler.processMessage(urgentProblem, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.urgency).toBe('immediate');
      }
    });

    it('should assess decision complexity', async () => {
      const complexProblem = `Should I shut down my company? I have 3 different product lines, 
        50 employees, regulatory compliance issues, investor obligations, customer contracts, 
        and potential acquirers showing interest.`;
      
      const response = await handler.processMessage(complexProblem, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.complexity).toBe('complex');
      }
    });
  });

  describe('validateReadiness', () => {
    it('should validate readiness with complete problem brief', async () => {
      const contextWithArtifact: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        messages: [
          { role: 'user', content: 'I need help...' },
          { role: 'assistant', content: 'Response...' },
        ],
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Should I pivot my startup from B2B to B2C?',
            context: 'Declining enterprise sales, growing consumer interest',
            stakeholders: ['founders', 'investors', 'team'],
            constraints: ['6 months runway', 'team resistance'],
            successCriteria: ['product-market fit', 'positive unit economics'],
            urgency: 'high' as const,
            complexity: 'complex' as const,
            decisionType: '1' as const,
            keyInsights: ['enterprise churn at 15%', 'consumer signals positive'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const result = await handler.validateReadiness(contextWithArtifact);

      expect(result.isReady).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.missingElements).toHaveLength(0);
      expect(result.elements.find(e => e.name === 'problem_statement')?.isPresent).toBe(true);
      expect(result.elements.find(e => e.name === 'context')?.isPresent).toBe(true);
      expect(result.elements.find(e => e.name === 'stakeholders')?.isPresent).toBe(true);
    });

    it('should identify missing problem statement', async () => {
      const contextWithoutArtifacts: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        messages: [{ role: 'user', content: 'Hello' }],
        artifacts: [],
      };

      const result = await handler.validateReadiness(contextWithoutArtifacts);

      expect(result.isReady).toBe(false);
      expect(result.score).toBeLessThan(0.5);
      expect(result.missingElements).toContain('problem_statement');
      expect(result.elements.find(e => e.name === 'problem_statement')?.isPresent).toBe(false);
    });

    it('should identify incomplete problem brief', async () => {
      const contextWithIncompleteArtifact: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'gathering' },
        messages: [{ role: 'user', content: 'Test message' }],
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Should I pivot?',
            context: '',
            stakeholders: [],
            constraints: [],
            successCriteria: [],
            urgency: 'medium' as const,
            complexity: 'moderate' as const,
            decisionType: '1' as const,
            keyInsights: [],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const result = await handler.validateReadiness(contextWithIncompleteArtifact);

      expect(result.isReady).toBe(false);
      expect(result.missingElements).toContain('context');
      expect(result.missingElements).toContain('stakeholders');
      expect(result.elements.find(e => e.name === 'context')?.isPresent).toBe(false);
      expect(result.elements.find(e => e.name === 'stakeholders')?.isPresent).toBe(false);
    });

    it('should consider interaction quality in validation', async () => {
      const contextWithMinimalInteraction: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        messages: [
          { role: 'user', content: 'Help' },
        ], // Only 1 message - insufficient interaction
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Complete problem statement here',
            context: 'Some context',
            stakeholders: ['stakeholder1'],
            constraints: ['constraint1'],
            successCriteria: ['success1'],
            urgency: 'high' as const,
            complexity: 'complex' as const,
            decisionType: '1' as const,
            keyInsights: ['insight1'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const result = await handler.validateReadiness(contextWithMinimalInteraction);

      expect(result.score).toBeLessThan(0.9); // Should be penalized for insufficient interaction
    });
  });

  describe('getNextPhase', () => {
    it('should return diagnostic_interview for complete problem intake', () => {
      const completeContext: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        messages: [],
        artifacts: [{
          id: 'artifact-1',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          content: {
            problemStatement: 'Complete problem',
            context: 'Context provided',
            stakeholders: ['stakeholder1'],
            constraints: ['constraint1'],
            successCriteria: ['success1'],
            urgency: 'high' as const,
            complexity: 'complex' as const,
            decisionType: '1' as const,
            keyInsights: ['insight1'],
          },
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const nextPhase = handler.getNextPhase(completeContext);
      
      expect(nextPhase).toBe('diagnostic_interview');
    });

    it('should return null for incomplete problem intake', () => {
      const incompleteContext: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'initial' },
        messages: [],
        artifacts: [],
      };

      const nextPhase = handler.getNextPhase(incompleteContext);
      
      expect(nextPhase).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty messages gracefully', async () => {
      const response = await handler.processMessage('', basicContext);

      expect(response.content).toBeTruthy();
      expect(response.shouldTransition).toBe(false);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'This is a very long message. '.repeat(1000);
      
      const response = await handler.processMessage(longMessage, basicContext);

      expect(response.content).toBeTruthy();
      expect(typeof response.content).toBe('string');
    });

    it('should handle messages with special characters', async () => {
      const specialMessage = 'Decision about émojis 🚀 and spécial chars: áéíóú, 中文';
      
      const response = await handler.processMessage(specialMessage, basicContext);

      expect(response.content).toBeTruthy();
    });

    it('should handle malformed context gracefully', async () => {
      const malformedContext: PhaseContext = {
        currentPhase: 'problem_intake',
        // @ts-expect-error - Testing malformed context
        phaseState: null,
        messages: [],
        artifacts: [],
      };

      expect(async () => {
        await handler.processMessage('Test message', malformedContext);
      }).not.toThrow();
    });

    it('should handle context with malformed artifacts', async () => {
      const contextWithBadArtifact: PhaseContext = {
        currentPhase: 'problem_intake',
        phaseState: { step: 'complete' },
        messages: [],
        artifacts: [{
          id: 'bad-artifact',
          sessionId: 'session-123',
          artifactType: 'problem_brief',
          // @ts-expect-error - Testing malformed artifact content
          content: null,
          phaseCreated: 'problem_intake',
          version: 1,
          isCurrent: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }],
      };

      const result = await handler.validateReadiness(contextWithBadArtifact);

      expect(result.isReady).toBe(false);
    });
  });

  describe('Pattern Recognition', () => {
    it('should recognize startup-specific decisions', async () => {
      const startupDecision = "Should I raise Series A or bootstrap for another year?";
      
      const response = await handler.processMessage(startupDecision, basicContext);

      expect(response.content.toLowerCase()).toContain('startup');
      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.keyInsights.some(insight => 
          insight.toLowerCase().includes('funding') || 
          insight.toLowerCase().includes('series a')
        )).toBe(true);
      }
    });

    it('should recognize career decisions', async () => {
      const careerDecision = "Should I quit my job to start a company?";
      
      const response = await handler.processMessage(careerDecision, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.decisionType).toBe('2'); // Personal/career decision
      }
    });

    it('should extract multiple stakeholders from complex descriptions', async () => {
      const complexDecision = `My co-founder and I disagree about our product direction. 
        Our investors are pushing for faster growth, employees are concerned about work-life balance, 
        and customers keep requesting features we don't want to build.`;
      
      const response = await handler.processMessage(complexDecision, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.stakeholders).toContain('co-founder');
        expect(content.stakeholders).toContain('investors');  
        expect(content.stakeholders).toContain('employees');
        expect(content.stakeholders).toContain('customers');
      }
    });

    it('should identify time-based constraints', async () => {
      const timeConstrainedDecision = `I need to decide by Friday whether to accept this job offer. 
        The lease on my apartment expires next month, and I promised my family I'd visit them over Christmas.`;
      
      const response = await handler.processMessage(timeConstrainedDecision, basicContext);

      if (response.artifacts?.[0]) {
        const content = response.artifacts[0].content as ProblemBriefContent;
        expect(content.constraints.some(c => c.toLowerCase().includes('friday'))).toBe(true);
        expect(content.urgency).toBe('immediate');
      }
    });
  });

  describe('Conversation Flow', () => {
    it('should progress through conversation stages appropriately', async () => {
      const initialContext = { ...basicContext };
      
      // Stage 1: Initial contact
      const response1 = await handler.processMessage(
        "I need help with a decision", 
        initialContext
      );
      expect(response1.content).toContain('Phoenix Framework');
      
      // Stage 2: Problem introduction
      const contextAfterGreeting: PhaseContext = {
        ...initialContext,
        phaseState: { step: 'gathering', interactionCount: 1 },
        messages: [
          { role: 'user', content: 'I need help with a decision' },
          { role: 'assistant', content: response1.content },
        ],
      };
      
      const response2 = await handler.processMessage(
        "I'm thinking about pivoting my startup",
        contextAfterGreeting
      );
      expect(response2.content.toLowerCase()).toContain('more');
      
      // Stage 3: Detailed problem description
      const contextAfterIntro: PhaseContext = {
        ...contextAfterGreeting,
        phaseState: { step: 'refining', interactionCount: 2 },
        messages: [
          ...contextAfterGreeting.messages,
          { role: 'user', content: "I'm thinking about pivoting my startup" },
          { role: 'assistant', content: response2.content },
        ],
      };
      
      const response3 = await handler.processMessage(
        "My B2B SaaS has high churn but I see consumer demand. Need to decide in 3 months.",
        contextAfterIntro
      );
      
      // Should now be ready to transition or nearly ready
      expect(response3.shouldTransition || response3.content.toLowerCase().includes('ready')).toBe(true);
    });
  });
});

const basicContext: PhaseContext = {
  currentPhase: 'problem_intake',
  phaseState: { step: 'initial' },
  messages: [],
  artifacts: [],
};