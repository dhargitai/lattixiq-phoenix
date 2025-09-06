import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { generateText, streamText } from 'ai';
import type {
  IAIRouter,
  AIModel,
  AIModelType,
  PhaseContext,
  SessionArtifact,
  FrameworkSelection,
  PerformanceMetrics,
  AIProviderConfig,
  AIResponse,
  StreamingResponse,
  CoreMessage,
} from '../types';
import { PhoenixError, ErrorCode } from '../utils/errors';
import { PerformanceTracker } from '../utils/performance-tracker';

/**
 * AI Router Service - Orchestrates AI model selection and context assembly
 * 
 * Implements multi-model strategy:
 * - GPT-4.1 for analysis tasks
 * - Gemini Flash for quick responses  
 * - Gemini Pro for deep thinking/strategy
 */
export class AIRouter implements IAIRouter {
  private performanceTracker: PerformanceTracker;
  private modelOverrides: Map<string, AIModelType> = new Map();

  constructor() {
    this.performanceTracker = new PerformanceTracker();
  }

  /**
   * Select appropriate AI model based on task type and preferences
   */
  selectModel(
    taskType: 'analysis' | 'quick_response' | 'deep_thinking' | 'framework_selection',
    modelOverride?: AIModelType,
    sessionPreferences?: Partial<AIProviderConfig>
  ): AIModel {
    // Use override if provided
    if (modelOverride) {
      return this.createModelConfig(modelOverride);
    }

    // Check session preferences
    if (sessionPreferences?.preferredModel) {
      return this.createModelConfig(sessionPreferences.preferredModel);
    }

    // Default model selection strategy
    switch (taskType) {
      case 'analysis':
        return this.createModelConfig('gpt-4.1');
      case 'quick_response':
        return this.createModelConfig('gemini-2.5-flash');
      case 'deep_thinking':
      case 'framework_selection':
        return this.createModelConfig('gemini-2.5-pro');
      default:
        return this.createModelConfig('gpt-4.1');
    }
  }

  /**
   * Assemble context for AI prompts with messages, artifacts, and frameworks
   */
  assembleContext(
    messages: CoreMessage[],
    artifacts?: SessionArtifact[],
    frameworks?: FrameworkSelection[],
    phaseContext?: PhaseContext
  ): {
    systemPrompt: string;
    contextMessages: CoreMessage[];
    metadata: Record<string, unknown>;
  } {
    const systemPromptParts: string[] = [];
    const contextMessages: CoreMessage[] = [...messages];
    const metadata: Record<string, unknown> = {};

    // Base system prompt for Phoenix Framework
    systemPromptParts.push(`You are the Phoenix Framework, an AI-powered decision sprint facilitator designed to help startup founders break through decision paralysis.

Your role is to guide users through structured decision-making processes using relevant mental models and frameworks. You are currently in the ${phaseContext?.currentPhase || 'unknown'} phase.

Key principles:
- Be conversational and supportive, not robotic
- Focus on one thing at a time to reduce cognitive load
- Use relevant mental models and frameworks to structure thinking
- Help users commit to clear next steps
- Maintain a calm, anxiety-reducing tone similar to Notion or Calm app`);

    // Add phase-specific context
    if (phaseContext?.currentPhase) {
      systemPromptParts.push(`\nCurrent Phase: ${phaseContext.currentPhase}`);
      if (phaseContext.phaseState) {
        systemPromptParts.push(`Phase State: ${JSON.stringify(phaseContext.phaseState, null, 2)}`);
      }
    }

    // Add artifacts context
    if (artifacts && artifacts.length > 0) {
      systemPromptParts.push('\n## Session Artifacts:');
      artifacts.forEach(artifact => {
        if (artifact.isCurrent) {
          systemPromptParts.push(`\n### ${artifact.artifactType}:\n${JSON.stringify(artifact.content, null, 2)}`);
        }
      });
      metadata.artifactsCount = artifacts.length;
    }

    // Add selected frameworks context
    if (frameworks && frameworks.length > 0) {
      systemPromptParts.push('\n## Selected Mental Models/Frameworks:');
      frameworks.forEach((framework, index) => {
        systemPromptParts.push(`\n${index + 1}. **${framework.knowledgeContentId}** (Score: ${framework.relevanceScore?.toFixed(2) || 'N/A'})`);
        if (framework.selectionReason) {
          systemPromptParts.push(`   - Reason: ${framework.selectionReason}`);
        }
        if (framework.scoreBreakdown?.reasoning) {
          systemPromptParts.push(`   - Analysis: ${framework.scoreBreakdown.reasoning}`);
        }
      });
      metadata.frameworksCount = frameworks.length;
    }

    // Add conversation flow guidance
    systemPromptParts.push(`\n## Conversation Guidelines:
- Keep responses focused and actionable
- Ask clarifying questions when needed
- Guide toward concrete next steps
- Use the selected frameworks to structure your responses
- Maintain supportive, anxiety-reducing tone`);

    return {
      systemPrompt: systemPromptParts.join('\n'),
      contextMessages,
      metadata,
    };
  }

  /**
   * Generate non-streaming AI response
   */
  async generateResponse(
    prompt: string,
    model: AIModel,
    context?: PhaseContext
  ): Promise<AIResponse> {
    const operationId = `ai-generate-${Date.now()}`;
    this.performanceTracker.startOperation(operationId, 'ai_generation');

    try {
      const startTime = Date.now();
      
      const result = await generateText({
        model: model.provider,
        prompt: prompt,
        temperature: model.config.temperature,
        abortSignal: this.createAbortSignal(model.config.timeoutMs),
      });

      const duration = Date.now() - startTime;

      // Track performance metrics
      const metrics: PerformanceMetrics = {
        duration,
        tokensUsed: result.usage?.totalTokens || 0,
        tokensInput: result.usage?.inputTokens || 0,
        tokensOutput: result.usage?.outputTokens || 0,
        cost: this.calculateCost(model.type, result.usage?.totalTokens || 0),
        modelUsed: model.type,
        operationId,
      };

      this.performanceTracker.recordAICall(model.type, metrics);
      this.performanceTracker.endOperation(operationId);

      return {
        content: result.text,
        metrics,
        model: model.type,
      };
    } catch (error) {
      this.performanceTracker.endOperation(operationId, error as Error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PhoenixError(
          ErrorCode.AI_TIMEOUT,
          'AI request timed out',
          { model: model.type, timeout: model.config.timeoutMs },
          true,
          ['Try again with a longer timeout', 'Use a different model']
        );
      }
      
      throw new PhoenixError(
        ErrorCode.AI_GENERATION_ERROR,
        'AI generation failed',
        { model: model.type, error: error instanceof Error ? error.message : String(error) },
        true,
        ['Check your API key', 'Try a different model', 'Reduce input length']
      );
    }
  }

  /**
   * Generate streaming AI response
   */
  async generateStreamingResponse(
    messages: CoreMessage[],
    model: AIModel,
    context?: PhaseContext
  ): Promise<StreamingResponse> {
    const operationId = `ai-stream-${Date.now()}`;
    this.performanceTracker.startOperation(operationId, 'ai_streaming');

    try {
      const startTime = Date.now();

      const result = await streamText({
        model: model.provider,
        messages,
        temperature: model.config.temperature,
        abortSignal: this.createAbortSignal(model.config.timeoutMs),
      });

      return {
        textStream: result.textStream,
        finishReason: result.finishReason,
        usage: result.usage,
        model: model.type,
        operationId,
        onFinish: async (finalResult) => {
          const duration = Date.now() - startTime;
          const usage = await finalResult.usage;
          
          const metrics: PerformanceMetrics = {
            duration,
            tokensUsed: usage?.totalTokens || 0,
            tokensInput: usage?.promptTokens || 0,
            tokensOutput: usage?.completionTokens || 0,
            cost: this.calculateCost(model.type, usage?.totalTokens || 0),
            modelUsed: model.type,
            operationId,
          };

          this.performanceTracker.recordAICall(model.type, metrics);
          this.performanceTracker.endOperation(operationId);
        },
      };
    } catch (error) {
      this.performanceTracker.endOperation(operationId, error as Error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new PhoenixError(
          ErrorCode.AI_TIMEOUT,
          'AI streaming request timed out',
          { model: model.type, timeout: model.config.timeoutMs },
          true,
          ['Try again with a longer timeout', 'Use a different model']
        );
      }
      
      throw new PhoenixError(
        ErrorCode.AI_STREAMING_ERROR,
        'AI streaming failed',
        { model: model.type, error: error instanceof Error ? error.message : String(error) },
        true,
        ['Check your API key', 'Try a different model', 'Reduce input length']
      );
    }
  }

  /**
   * Set model override for specific session or message
   */
  setModelOverride(sessionId: string, modelType: AIModelType): void {
    this.modelOverrides.set(sessionId, modelType);
  }

  /**
   * Clear model override for session
   */
  clearModelOverride(sessionId: string): void {
    this.modelOverrides.delete(sessionId);
  }

  /**
   * Get performance metrics for AI operations
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceTracker.getMetrics();
  }

  /**
   * Health check for AI providers
   */
  async healthCheck(): Promise<{
    openai: boolean;
    google: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let openaiHealthy = false;
    let googleHealthy = false;

    // Check OpenAI
    try {
      if (!process.env.OPENAI_API_KEY) {
        errors.push('Missing OPENAI_API_KEY environment variable');
      } else {
        openaiHealthy = true;
      }
    } catch (error) {
      errors.push(`OpenAI health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Check Google
    try {
      if (!process.env.GOOGLE_API_KEY) {
        errors.push('Missing GOOGLE_API_KEY environment variable');
      } else {
        googleHealthy = true;
      }
    } catch (error) {
      errors.push(`Google health check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      openai: openaiHealthy,
      google: googleHealthy,
      errors,
    };
  }

  /**
   * Create model configuration
   */
  private createModelConfig(modelType: AIModelType): AIModel {
    switch (modelType) {
      case 'gpt-4.1':
        return {
          type: 'gpt-4.1',
          provider: openai('gpt-4-turbo'),
          config: {
            temperature: 0.3,
            maxTokens: 2000,
            timeoutMs: 30000,
          },
        };
      case 'gpt-4.1-mini':
        return {
          type: 'gpt-4.1-mini',
          provider: openai('gpt-4o-mini'),
          config: {
            temperature: 0.3,
            maxTokens: 1500,
            timeoutMs: 20000,
          },
        };
      case 'gemini-2.5-flash':
        return {
          type: 'gemini-2.5-flash',
          provider: google('gemini-2.0-flash-exp'),
          config: {
            temperature: 0.4,
            maxTokens: 1500,
            timeoutMs: 20000,
          },
        };
      case 'gemini-2.5-pro':
        return {
          type: 'gemini-2.5-pro',
          provider: google('gemini-2.0-flash-thinking-exp-01-21'),
          config: {
            temperature: 0.5,
            maxTokens: 3000,
            timeoutMs: 60000,
          },
        };
      default:
        throw new PhoenixError(
          ErrorCode.INVALID_MODEL_TYPE,
          `Unknown model type: ${modelType}`,
          { model: modelType },
          false,
          ['Use a supported model type', 'Check the available models']
        );
    }
  }

  /**
   * Create abort signal with timeout
   */
  private createAbortSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  /**
   * Calculate approximate cost for AI model usage
   */
  private calculateCost(modelType: AIModelType, tokens: number): number {
    // Approximate costs per 1K tokens (as of 2024)
    const costPer1KTokens: Partial<Record<AIModelType, number>> = {
      'gpt-4.1': 0.03,
      'gpt-4.1-mini': 0.0015,
      'gemini-2.5-flash': 0.001,
      'gemini-2.5-pro': 0.0035,
    };

    return (tokens / 1000) * (costPer1KTokens[modelType] || 0.01);
  }
}