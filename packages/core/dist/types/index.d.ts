/**
 * User interface with UUID, email, timestamps, and user preference fields
 * Source: architecture/data-models.md#User
 */
export interface User {
    id: string;
    email: string;
    createdAt: Date;
    testimonialState: 'not_asked' | 'asked_first' | 'dismissed_first' | 'submitted' | 'asked_second' | 'dismissed_second';
    reminderEnabled: boolean;
    reminderTime: string;
    reminderTimezone: string;
    reminderLastSent?: Date;
    testimonialUrl?: string;
    shownModals: string[];
    roadmapCount: number;
    freeRoadmapsUsed: boolean;
    testimonialBonusUsed: boolean;
}
/**
 * DecisionSprint interface for storing problem briefs and commitment memos
 * Source: architecture/data-models.md#DecisionSprint
 */
export interface DecisionSprint {
    id: string;
    userId: string;
    problemBrief: Record<string, any>;
    commitmentMemo: Record<string, any>;
    createdAt: Date;
}
/**
 * KnowledgeContent interface for mental models with 1536-dimensional vector embeddings
 * Source: architecture/data-models.md#KnowledgeContent
 */
export type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';
export type MainCategory = 'Core Sciences & Mathematics' | 'Biology & Evolution' | 'Psychology & Human Behavior' | 'Thinking & Learning Processes' | 'Human Systems & Strategy';
export type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
export type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';
export type ProblemCategory = 'pivot' | 'hiring' | 'fundraising' | 'co-founder_conflict' | 'product-market_fit' | 'go-to-market' | 'team_and_culture' | 'operations' | 'competitive_strategy' | 'pricing' | 'risk_management';
export interface KnowledgeContent {
    id: string;
    title: string;
    type: KnowledgeContentType;
    embedding: number[];
    language: string;
    mainCategory: MainCategory;
    subcategory: string;
    hook: string;
    definition: string;
    analogyOrMetaphor: string;
    keyTakeaway: string;
    classicExample: string;
    modernExample: string;
    pitfall: string;
    payoff: string;
    visualMetaphor: string;
    visualMetaphorUrl?: string;
    diveDeeperMechanism: string;
    diveDeeperOriginStory: string;
    diveDeeperPitfallsNuances: string;
    extraContent?: string;
    targetPersona: TargetPersona[];
    startupPhase: StartupPhase[];
    problemCategory: ProblemCategory[];
    superModel: boolean;
}
/**
 * UserSubscriptions interface for managing Stripe subscription data
 */
export interface UserSubscriptions {
    userId: string;
    subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionCurrentPeriodEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}
/**
 * ContentBlocks interface for dynamic content management
 */
export interface ContentBlocks {
    id: string;
    contentId: string;
    content: string;
    metadata?: Record<string, any>;
    published: boolean;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=index.d.ts.map