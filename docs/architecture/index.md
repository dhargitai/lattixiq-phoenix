# The Phoenix Framework Fullstack Architecture Document

## Table of Contents

- [The Phoenix Framework Fullstack Architecture Document](#table-of-contents)
  - [Introduction](#introduction)
  - [High Level Architecture](#high-level-architecture)
  - [Phoenix Core Engine](#phoenix-core-engine)
  - [Tech Stack](#tech-stack)
  - [Data Models](#data-models)
  - [API Specification](#api-specification)
  - [Components](#components)
  - [Unified Project Structure](#unified-project-structure)
  - [Development Workflow](#development-workflow)
  - [Deployment Architecture](#deployment-architecture)
  - [Coding Standards](#coding-standards)

## Phoenix Core Engine

**Document:** [Phoenix Core Engine](./phoenix-core-engine.md)

The Phoenix Core Engine is the foundational session management and AI orchestration system that powers all Phoenix Framework decision sprints. This comprehensive system manages:

- **Session Management**: Create, manage, and persist decision sprint sessions with full state tracking
- **Conversation Branching**: Support "jump back" functionality to explore different conversation paths  
- **Multi-Model AI Orchestration**: Dynamic routing between GPT-4.1, Gemini Flash, and Gemini Pro
- **Framework Selection**: Semantic search, scoring, and curation of relevant mental models
- **Phase Management**: Automated progression through Phoenix Framework phases with validation
- **Performance Tracking**: Comprehensive monitoring of timing, costs, and effectiveness

**Key Components:**
- Phoenix Orchestrator (main controller)
- Session Manager (conversation branching & persistence)
- Framework Selector (semantic search & scoring)
- AI Router (multi-model coordination)
- Phase Manager (state machine)
- Phase Handlers (specialized processors)

**Database Schema:** Complete session management schema with 6 new tables supporting conversation branching, framework selection tracking, and comprehensive performance monitoring.

**Integration:** Seamlessly integrates with existing knowledge management system, user authentication, and provides clean API for frontend Sprint View implementation.
