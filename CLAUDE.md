# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The Phoenix Framework is a sophisticated serverless web application that helps startup founders break through decision paralysis using AI-powered interactive decision sprints. The application combines a comprehensive knowledge management system with semantic search capabilities to guide users through structured decision-making processes using the most relevant mental models and frameworks.

## Architecture

This is a **Next.js 15.5 application** with the following structure:
- `src/app/` - Next.js App Router application
- `scripts/` - Utility scripts for embeddings generation and CLI tools
- `supabase/` - Database schema and migrations
- `docs/` - Comprehensive project documentation
- `.bmad-core/` - BMAD project management system

**Key Architectural Principles:**
- Serverless architecture using Netlify Functions
- Vector database for semantic search using pgvector
- AI-powered framework selection with OpenAI embeddings
- Clean separation between presentation layer and business logic
- Sophisticated knowledge management with well-structured content

## Tech Stack

- **Runtime:** Node.js v24
- **Package Manager:** pnpm v9.0+
- **Frontend:** Next.js v15.5 with App Router + Turbopack
- **AI Integration:** Vercel AI SDK v5.0.23 + AI Elements
- **AI Models:** Google Gemini (@ai-sdk/google v2.0.8) + OpenAI (@ai-sdk/openai v2.0.20)
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **UI:** Tailwind CSS v4.1.12 (no component library yet)
- **State Management:** Zustand v5.0.8
- **Animation:** Framer Motion v12.23.12
- **Database:** PostgreSQL with pgvector extension (via Supabase)
- **Auth:** Supabase Auth v2.56
- **Vector Search:** HNSW indexing for semantic similarity
- **Payments:** Stripe v18.4.0 (frontend and backend)
- **Logging:** Winston for structured logging
- **Testing:** Vitest v3.2.4 (unit/integration) + Playwright v1.55 (E2E)
- **Deployment:** Netlify Functions + Edge

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server with Turbopack
pnpm dev

# Build application
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck

# Format code
pnpm format

# Generate embeddings for knowledge content
pnpm embeddings:generate

# Test silently (used in CI)
pnpm test:silent
```

## Environment Variables Required

```bash
# Create .env.local in project root with:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GOOGLE_API_KEY=your_google_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Optional for development
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

## Key API Endpoints

### Decision Sprint APIs
- `POST /api/sprint` - Streaming endpoint for interactive Phoenix Framework sessions
- `GET /api/decisions` - Fetch user's decision sprint history
- `POST /api/decisions` - Save completed decision sprint

### Knowledge Management APIs
- `POST /api/search/semantic` - Semantic search across knowledge content
- `GET /api/knowledge/content` - Retrieve knowledge content by ID
- `GET /api/knowledge/categories` - Get available categories and subcategories
- `POST /api/knowledge/recommend` - Get personalized framework recommendations

### User Management APIs
- `GET /api/user/profile` - Get user profile and preferences
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/subscription` - Get subscription status
- `POST /api/user/subscription` - Manage subscription

### Content Management APIs
- `GET /api/content/blocks` - Get dynamic content blocks
- `POST /api/embeddings/generate` - Generate embeddings for new content (admin)

## Data Models

### Core Models

**User:**
```typescript
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

**DecisionSprint:**
```typescript
interface DecisionSprint {
  id: string;
  userId: string;
  problemBrief: Record<string, any>;
  commitmentMemo: Record<string, any>;
  createdAt: Date;
}
```

### Knowledge Management Models

**KnowledgeContent:** (Core of the system)
```typescript
type KnowledgeContentType = 'mental-model' | 'cognitive-bias' | 'fallacy' | 'strategic-framework' | 'tactical-tool';
type TargetPersona = 'founder' | 'executive' | 'investor' | 'product_manager';
type StartupPhase = 'ideation' | 'seed' | 'growth' | 'scale-up' | 'crisis';

interface KnowledgeContent {
  id: string;
  title: string;
  type: KnowledgeContentType;
  embedding: number[]; // 1536-dimensional vector
  language: string;
  mainCategory: string;
  subcategory: string;
  
  // Crystallize & Apply Content Structure
  hook: string; // Engaging opener
  definition: string; // Clear explanation
  analogyOrMetaphor: string; // Conceptual bridge
  keyTakeaway: string; // Tweet-sized summary
  classicExample: string; // Well-known example
  modernExample: string; // Contemporary scenario
  pitfall: string; // Negative consequences
  payoff: string; // Benefits when applied
  visualMetaphor: string; // Visual representation prompt
  visualMetaphorUrl?: string; // Optional image URL
  
  // Deep Dive Content
  diveDeeperMechanism: string; // How it works
  diveDeeperOriginStory: string; // Historical development
  diveDeeperPitfallsNuances: string; // Advanced limitations
  extraContent?: string; // Additional markdown content
  
  // Targeting & Personalization
  targetPersona: TargetPersona[];
  startupPhase: StartupPhase[];
  problemCategory: string[];
  superModel: boolean; // Foundational concept flag
}
```

**UserSubscriptions:**
```typescript
interface UserSubscriptions {
  userId: string;
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionCurrentPeriodEnd?: Date;
}
```

**ContentBlocks:**
```typescript
interface ContentBlocks {
  id: string;
  contentId: string;
  content: string; // Markdown content
  metadata?: Record<string, any>;
  published: boolean;
}
```

## Vector Database & Semantic Search

### Knowledge Management System
The Phoenix Framework includes a sophisticated knowledge management system:

- **Content Types**: Mental models, cognitive biases, fallacies, strategic frameworks, tactical tools
- **Methodology**: Content structure for optimal learning
- **Search**: Vector similarity search using OpenAI embeddings (1536 dimensions)
- **Targeting**: Multi-dimensional filtering by persona, startup phase, problem category
- **Performance**: HNSW indexing for sub-second search responses

### Database Functions
- `match_knowledge_content_by_language()` - Language-filtered semantic search
- `match_knowledge_content_by_subcategory()` - Multi-pool search with subcategory filtering
- `handle_new_user()` - Automatic user creation trigger

### Embedding Generation
Use the embedding generation script to populate the knowledge base:

```bash
# Generate embeddings for all content in lib/knowledge_content.json
pnpm embeddings:generate

# Monitor progress with custom reporter
pnpm test:silent
```

## Scripts

### Embedding Generation (`scripts/generate-embeddings.ts`)
- Processes knowledge content and generates vector embeddings
- Handles batch processing with rate limiting
- Supports resume from interruption
- Includes cost estimation and progress tracking

### Action Roadmap CLI (`scripts/action-roadmap-cli.ts`)
- Command-line tool for generating action roadmaps
- Integrates with knowledge base for framework selection
- Supports various output formats (prompt, JSON, verbose)

```bash
# Generate roadmap from text file
npx tsx scripts/action-roadmap-cli.ts input-query.txt

# Full JSON output with metadata
npx tsx scripts/action-roadmap-cli.ts --full input-query.txt

# Verbose mode with progress
npx tsx scripts/action-roadmap-cli.ts --verbose input-query.txt
```

## BMAD Core Integration

This project uses BMAD (Build Measure and Deploy) core system for project management:
- Templates available in `.bmad-core/templates/`
- Workflows defined in `.bmad-core/workflows/`
- Agent configurations in `.bmad-core/agents/`
- Use `/BMad:agents:pm` command to access Product Manager agent

## Development Guidelines

1. **Code Architecture:**
   - Keep business logic separate from UI components
   - Use TypeScript strictly with proper type definitions
   - Implement proper error handling and loading states
   - Follow Next.js App Router conventions

2. **Knowledge Management:**
   - All knowledge content follows a structured content model
   - Vector embeddings must be regenerated when content changes
   - Use semantic search functions for framework selection
   - Implement proper caching for expensive embedding operations

3. **UI Development:**
   - Use Tailwind CSS v4.x for styling
   - Implement conversational UI patterns with streaming responses
   - Manage state with Zustand (avoid prop drilling)
   - Ensure responsive design for mobile-first experience

4. **Database Operations:**
   - Use Row Level Security (RLS) for all user data access
   - Implement proper indexing for vector search performance
   - Handle embedding generation in batches to manage API costs
   - Use Supabase client for database operations

5. **Testing Strategy:**
   - Unit tests for utility functions and core logic
   - Integration tests for API endpoints and database operations
   - E2E tests for complete user flows
   - Test embedding generation and search functionality

6. **Performance:**
   - Use HNSW indexes for vector similarity search
   - Implement caching for frequently accessed content
   - Optimize embedding batch sizes to balance speed and cost
   - Monitor database query performance

7. **Deployment:**
   - Netlify Functions for serverless backend
   - Netlify Edge for Next.js frontend
   - Environment variables properly configured
   - Database migrations handled through Supabase

## User Experience Focus

The application prioritizes:
- **Conversational Interface:** Chat-like interaction using Vercel AI SDK
- **One-Thing-at-a-Time:** Single focus to reduce cognitive load
- **Anxiety Reduction:** Clean, minimalist design similar to Notion/Calm
- **Streaming Responses:** Real-time, dynamic user experience
- **Personalized Recommendations:** AI-powered framework selection based on context
- **Rich Learning Content:** Content structure for better retention

## Project Status

This project is in **active development** with:
- ✅ Comprehensive database schema and vector search infrastructure
- ✅ Knowledge management system with 5 content types
- ✅ Semantic search and embedding generation capabilities
- ✅ User management and subscription system
- ✅ Content management and dynamic UI blocks
- 🔄 Frontend implementation in progress
- 🔄 API endpoints development
- ⏳ Testing framework setup pending

## Important Notes

- **Package Manager:** This project uses `pnpm`, not `npm`
- **Database:** Requires PostgreSQL with pgvector extension (provided by Supabase)
- **API Keys:** OpenAI API key required for embedding generation
- **Development:** Use Turbopack for faster development builds (`pnpm dev`)
- **Content Updates:** Run embedding generation after knowledge content changes
- **Context7 Integration:** Always try to use context7 MCP first for package documentation lookups
