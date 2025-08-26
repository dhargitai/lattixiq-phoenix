# **Data Models**

The Phoenix Framework utilizes a sophisticated data model that combines user management, decision tracking, an advanced knowledge management system with semantic search capabilities, and a comprehensive session management system powered by the Phoenix Core Engine.

## **Phoenix Core Engine Data Models** 🚀

The Phoenix Core Engine introduces comprehensive session management, conversation branching, and AI orchestration capabilities. For complete details, see [Phoenix Core Engine Architecture](./phoenix-core-engine.md).

### **Sessions**
- **Purpose:** Track Phoenix Framework decision sprint sessions with phase progression and configuration
- **Key Features:** Multi-phase state tracking, conversation branching support, AI model preferences
- **Schema:** `sessions` table with phase_states JSONB, config JSONB, and activity tracking

### **Messages**  
- **Purpose:** Store conversation history with full branching support for exploration and rollback
- **Key Features:** Parent-child message relationships, active branch tracking, performance metrics
- **Schema:** `messages` table with parent_message_id for branching, is_active_branch flags

### **Message Embeddings**
- **Purpose:** Vector embeddings for messages enabling semantic search and problem understanding  
- **Key Features:** 1536-dimensional vectors, HNSW indexing, sub-second search performance
- **Schema:** `message_embeddings` table with vector(1536) using pgvector extension

### **Session Artifacts**
- **Purpose:** Store structured artifacts generated during sessions (problem briefs, commitment memos, etc.)
- **Key Features:** Versioning system, artifact evolution tracking, links to creating messages
- **Schema:** `session_artifacts` table with version control and current artifact flags

### **Phase Transitions** 
- **Purpose:** Comprehensive log of phase transitions with validation results and reasoning
- **Key Features:** Detailed validation scoring, transition triggers, audit trail
- **Schema:** `phase_transitions` table with validation_results JSONB and reasoning

### **Framework Selections**
- **Purpose:** Track which knowledge frameworks were selected, scored, and applied during sessions  
- **Key Features:** Transparent scoring breakdowns, ranking system, application tracking
- **Schema:** `framework_selections` table with score_breakdown JSONB and application notes

## **User**

- **Purpose:** To store user profile data and interaction tracking.
- **Key Attributes:**
    - `id`: `UUID` - Primary key, references `auth.users.id`
    - `email`: `text` - User's email address
    - `created_at`: `timestamp` - When the user signed up
    - `testimonial_state`: `enum` - Tracks testimonial collection state (not_asked, asked_first, submitted, etc.)
    - `reminder_enabled`: `boolean` - Whether user has enabled reminders
    - `reminder_time` & `reminder_timezone` - User's reminder preferences
    - `testimonial_url`: `text` - Optional URL to user's testimonial
    - `shown_modals`: `jsonb` - Array tracking which guidance modals have been shown
    - `roadmap_count`: `integer` - Total roadmaps created by user
    - `free_roadmaps_used` & `testimonial_bonus_used`: `boolean` - Usage tracking flags
- **TypeScript Interface:**
    
    ```tsx
    interface User {
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
    ```
    

## **DecisionSprint**

- **Purpose:** To store the output ("Commitment Memo") of a completed Phoenix Framework sprint.
- **Key Attributes:**
    - `id`: `UUID` - Primary key
    - `user_id`: `UUID` - Foreign key to the `User` table
    - `problem_brief`: `JSONB` - The validated problem statement
    - `commitment_memo`: `JSONB` - The final decision, rationale, and risks
    - `created_at`: `timestamp` - When the sprint was completed
- **TypeScript Interface:**

```tsx
interface DecisionSprint {
  id: string;
  userId: string;
  problemBrief: Record<string, any>;
  commitmentMemo: Record<string, any>;
  createdAt: Date;
}
```

## **KnowledgeContent** 🧠

- **Purpose:** The core knowledge management system storing mental models, cognitive biases, fallacies, strategic frameworks, and tactical tools with vector embeddings for semantic search.
- **Content Structure:** Rich, structured content fields.
- **Key Attributes:**
    - `id`: `UUID` - Primary key
    - `title`: `text` - Name of the mental model/framework
    - `type`: `enum` - One of: mental-model, cognitive-bias, fallacy, strategic-framework, tactical-tool
    - `embedding`: `vector(1536)` - Vector embedding for semantic search using OpenAI text-embedding-3-small
    - `language`: `text` - Content language (default: English)
    
    **Categorization:**
    - `main_category`: `enum` - Core Sciences & Mathematics, Biology & Evolution, Psychology & Human Behavior, Thinking & Learning Processes, Human Systems & Strategy
    - `subcategory`: `enum` - 18 specific subcategories for granular organization
    
    **Content Fields:**
    - `hook`: `text` - Engaging opener that anchors abstract concepts in familiar experiences
    - `definition`: `text` - Crystal-clear, 1-2 sentence explanation in simple language
    - `analogy_or_metaphor`: `text` - Powerful conceptual tool for understanding
    - `key_takeaway`: `text` - Bold, tweet-sized summary of the core concept
    - `classic_example`: `text` - Well-known formal example of the concept
    - `modern_example`: `text` - Everyday modern life scenario demonstrating the concept
    - `pitfall`: `text` - Negative consequence when the concept is ignored
    - `payoff`: `text` - Benefit when the concept is applied correctly
    - `visual_metaphor`: `text` - Text prompt for generating visual representation
    - `visual_metaphor_url`: `text` - Optional URL to pre-generated image
    
    **Deep Dive Content:**
    - `dive_deeper_mechanism`: `text` - Detailed explanation of how the concept works cognitively
    - `dive_deeper_origin_story`: `text` - Historical development and key figures
    - `dive_deeper_pitfalls_nuances`: `text` - Advanced understanding of limitations
    - `extra_content`: `text` - Additional arbitrary long markdown content
    
    **Targeting & Personalization:**
    - `target_persona`: `text[]` - Array: founder, executive, investor, product_manager
    - `startup_phase`: `text[]` - Array: ideation, seed, growth, scale-up, crisis
    - `problem_category`: `text[]` - Array: pivot, hiring, fundraising, co-founder_conflict, product-market_fit, go-to-market, team_and_culture, operations, competitive_strategy, pricing, risk_management
    - `super_model`: `boolean` - Whether this is a foundational "super model" concept

- **TypeScript Interface:**

```tsx
type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';

type MainCategory = 'Core Sciences & Mathematics' | 'Biology & Evolution' | 'Psychology & Human Behavior' | 'Thinking & Learning Processes' | 'Human Systems & Strategy';

type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';
type ProblemCategory = 'pivot' | 'hiring' | 'fundraising' | 'co-founder_conflict' | 'product-market_fit' | 'go-to-market' | 'team_and_culture' | 'operations' | 'competitive_strategy' | 'pricing' | 'risk_management';

interface KnowledgeContent {
  id: string;
  title: string;
  type: KnowledgeContentType;
  embedding: number[]; // 1536-dimensional vector
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
```

## **UserSubscriptions**

- **Purpose:** Manages Stripe subscription data and billing information.
- **Key Attributes:**
    - `user_id`: `UUID` - Primary key, foreign key to User table
    - `subscription_status`: `text` - free, active, canceled, past_due, trialing, incomplete, incomplete_expired
    - `stripe_customer_id`: `text` - Stripe customer ID
    - `stripe_subscription_id`: `text` - Active Stripe subscription ID
    - `subscription_current_period_end`: `timestamp` - End date of current billing period
    - `created_at` & `updated_at`: `timestamp` - Audit fields
- **TypeScript Interface:**

```tsx
interface UserSubscriptions {
  userId: string;
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete' | 'incomplete_expired';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionCurrentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

## **ContentBlocks**

- **Purpose:** Stores dynamic content blocks for modals, messages, and other UI elements with content management capabilities.
- **Key Attributes:**
    - `id`: `UUID` - Primary key
    - `content_id`: `text` - Unique slug identifier for the content block
    - `content`: `text` - Markdown content to be displayed
    - `metadata`: `jsonb` - Optional structured data for additional configuration
    - `published`: `boolean` - Whether the content is published and visible to users
    - `created_at` & `updated_at`: `timestamp` - Audit fields
- **TypeScript Interface:**

```tsx
interface ContentBlocks {
  id: string;
  contentId: string;
  content: string;
  metadata?: Record<string, any>;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## **Database Functions**

The system includes specialized PostgreSQL functions for semantic search:

- `match_knowledge_content_by_language()` - Semantic search with language filtering
- `match_knowledge_content_by_subcategory()` - Multi-pool search strategy with subcategory filtering
- `handle_new_user()` - Trigger for automatic user creation from Supabase Auth

---
