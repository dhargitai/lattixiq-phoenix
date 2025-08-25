# **Tech Stack**

This table is the definitive technology selection for the project.

| Category | Technology | Version | Purpose | Rationale |
| --- | --- | --- | --- | --- |
| **Runtime** | Node.js | v24 | JavaScript runtime | Latest stable version for modern features and performance. |
| **Monorepo Tool** | Turborepo | v2.5.6 | Build system for monorepos | High-performance build caching and task orchestration. |
| **Framework** | Next.js | v15.5 | Frontend/Fullstack Framework | Industry-standard React framework for production applications. |
| **AI Integration** | Vercel AI SDK | v5.0.15 | AI library for frontend | Provides core hooks and utilities for streaming conversational UI. |
| **AI UI Components** | Vercel AI Elements | v1.0.5 | React components for AI apps | Accelerates development of AI-specific interfaces. |
| **AI Models** | @ai-sdk/google | v2.0.8 | Google Gemini SDK | Interface for using Google's AI models. |
| **AI Models** | @ai-sdk/openai | v2.0.15 | OpenAI SDK | Interface for using OpenAI's models. |
| **UI Library** | DaisyUI | v5.0.50 | Tailwind CSS Component Library | Provides a rich set of unstyled components, aligning with a minimalist aesthetic. |
| **Styling** | Tailwind CSS | v4.1.12 | Utility-First CSS Framework | Enables rapid and consistent styling. |
| **State Management** | Zustand | v5.0.7 | Minimalist State Management | Simple, unopinionated state management solution that reduces boilerplate. |
| **Animation** | Framer Motion | v12.23.12 | Animation Library for React | Powerful and easy-to-use library for fluid UI animations. |
| **Utilities** | clsx | v2.1.1 | Classname utility | Simple utility for conditionally joining class names. |
| **Utilities** | input-otp | v1.4.2 | One-time password input | Specialized component for handling OTP inputs if needed for auth. |
| **Database & Auth** | Supabase JS | v2.53 | Supabase Client Library | Official SDK for interacting with the Supabase backend. |
| **Vector Database** | pgvector | Latest | PostgreSQL Extension | Enables vector similarity search for semantic content matching. |
| **Embeddings Service** | OpenAI Embeddings | text-embedding-3-small | AI Text Embeddings | Generates 1536-dimensional vectors for semantic search capabilities. |
| **Search Infrastructure** | HNSW Indexing | Built-in | Vector Index Algorithm | High-performance approximate nearest neighbor search for large-scale vector operations. |
| **Payments** | Stripe JS | v7.8 | Stripe Client Library | Frontend library for Stripe payments (for future monetization). |
| **Payments** | Stripe Node | v18.4.0 | Stripe Server-side Library | Backend library for Stripe integration (for future monetization). |
| **Unit/Integration Testing** | Vitest | v3.4.2 | Test Runner | Modern, fast, and Vite-native test framework. |
| **E2E Testing** | Playwright | v1.55 | End-to-End Testing Tool | Robust and reliable for cross-browser end-to-end testing. |
| **Content Processing** | Winston | Latest | Logging Framework | Structured logging for embedding generation and search operations. |
| **Batch Processing** | Custom Scripts | N/A | Data Pipeline Tools | TypeScript scripts for embedding generation, content updates, and knowledge base management. |

## **Vector Database Infrastructure**

### **PostgreSQL Extensions**
- **pgvector**: Core extension enabling vector operations and similarity search
- **uuid-ossp**: UUID generation for primary keys
- **supabase_vault**: Secure credential storage

### **Search & Embeddings Stack**
- **OpenAI API Integration**: text-embedding-3-small model for generating 1536-dimensional vectors
- **Vector Storage**: PostgreSQL VECTOR(1536) data type with automatic indexing
- **Search Algorithms**: Cosine similarity with configurable thresholds
- **Performance Optimization**: HNSW indexes for sub-second query performance

### **Knowledge Management Pipeline**
- **Content Ingestion**: TypeScript scripts for processing knowledge content
- **Embedding Generation**: Batched API calls with retry logic and rate limiting
- **Vector Indexing**: Automatic index updates on content changes
- **Search Functions**: Custom PostgreSQL functions for multi-dimensional filtering

---
