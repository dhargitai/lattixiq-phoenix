# Epic 2: The Interactive Web Experience (MVP)

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2025-08-25 | 1.0 | Initial Epic 2 draft creation | PM (John) |

---

## Epic Overview

### Goal
To build the minimalist, conversational web interface that connects to the core engine, integrating the Vercel AI SDK and AI Elements to deliver the full end-to-end "Phoenix Framework" sprint experience to our first users.

### Business Value
- **User Impact**: Provides founders with immediate access to decision-making support through an intuitive, anxiety-reducing interface
- **Market Differentiation**: Creates a unique conversational AI experience specifically designed for startup decision paralysis
- **MVP Validation**: Enables rapid testing with target users to validate core value proposition

### Success Metrics
- User completes full Phoenix Framework sprint end-to-end
- Sub-second response time for streaming AI interactions
- 90%+ mobile responsiveness score
- WCAG 2.1 AA compliance achieved
- User anxiety reduction (measured via user feedback)

---

## User Stories

### Story 2.1: Sprint View Implementation
**As a** startup founder,
**I want** to initiate and complete a Phoenix Framework decision sprint,
**so that** I can break through my decision paralysis with guided support.

**Priority**: P0 (Critical)
**Size**: L (Large)

### Story 2.2: Conversational AI Interface
**As a** user in a decision sprint,
**I want** real-time, streaming responses from the AI assistant,
**so that** the experience feels like a natural conversation rather than slow form submissions.

**Priority**: P0 (Critical)
**Size**: M (Medium)

### Story 2.3: Dashboard/Hangar View
**As a** returning user,
**I want** to see and access my past decision sprints,
**so that** I can review my commitment memos and track my decisions over time.

**Priority**: P1 (High)
**Size**: M (Medium)

### Story 2.4: Commitment Memo Generation
**As a** user completing a sprint,
**I want** a professionally formatted commitment memo,
**so that** I have a shareable document capturing my decision and rationale.

**Priority**: P0 (Critical)
**Size**: M (Medium)

### Story 2.5: Mobile-First Responsive Design
**As a** mobile user,
**I want** the full Phoenix Framework experience on my phone,
**so that** I can work through decisions anywhere without needing a desktop.

**Priority**: P0 (Critical)
**Size**: M (Medium)

---

## Technical Requirements

### Architecture
- **Framework**: Next.js 15.5 with App Router
- **Build System**: Turbopack for development
- **Deployment**: Netlify Functions (serverless)

### Core Technologies
- **AI Integration**: 
  - Vercel AI SDK v5.0.23 for streaming conversations
  - AI Elements for specialized UI components
  - Integration with Phoenix Framework core engine
  
- **UI/UX Stack**:
  - Tailwind CSS v4.1.12 for styling
  - Shadcn/ui components (when added)
  - Framer Motion v12.23.12 for animations
  - One-thing-at-a-time interaction paradigm

### API Endpoints Required
- `POST /api/sprint` - Streaming endpoint for Phoenix Framework sessions
- `GET /api/decisions` - Fetch user's decision history
- `POST /api/decisions` - Save completed decision sprints
- `POST /api/search/semantic` - Semantic search for framework selection

### State Management
- Zustand v5.0.8 for global state
- Local state for UI components
- Session persistence for sprint progress

### Performance Requirements
- Time to Interactive (TTI): < 3 seconds
- Streaming response latency: < 500ms
- Lighthouse score: > 90 for Performance
- Bundle size: < 200KB for initial load

---

## Acceptance Criteria

### Sprint Flow
- [ ] User can initiate a new decision sprint with problem input
- [ ] System conducts interactive diagnostic interview
- [ ] Type 1/Type 2 decision classification works correctly
- [ ] Validated Problem Brief is generated and confirmed
- [ ] Semantic framework selection returns relevant models
- [ ] Framework application guides user step-by-step
- [ ] Commitment Memo is generated with all required sections
- [ ] Micro-Bet and First Domino are clearly defined

### Technical Implementation
- [ ] Vercel AI SDK streaming works without interruption
- [ ] State persists across page refreshes during sprint
- [ ] Mobile responsive design works on all screen sizes
- [ ] WCAG 2.1 AA accessibility standards met
- [ ] All API endpoints return appropriate status codes
- [ ] Error states are handled gracefully with user feedback

### User Experience
- [ ] Interface follows one-thing-at-a-time principle
- [ ] Conversational flow feels natural and responsive
- [ ] Loading states are clear and anxiety-reducing
- [ ] Progress indicators show sprint advancement
- [ ] Document generation appears "live" and collaborative

---

## Dependencies

### External Dependencies
- Phoenix Framework core engine (Epic 1)
- Supabase database schema configured
- OpenAI API key for embeddings
- Google Gemini API key for AI responses
- Vercel AI SDK properly configured

### Internal Dependencies
- Knowledge content with embeddings generated
- Database migrations completed
- Environment variables configured
- API route handlers implemented

---

## Risks and Mitigations

### Risk 1: AI Response Latency
**Impact**: High
**Probability**: Medium
**Mitigation**: Implement response caching, optimize prompt engineering, use streaming for perceived performance

### Risk 2: Mobile Performance
**Impact**: High
**Probability**: Low
**Mitigation**: Progressive enhancement, lazy loading, optimized bundle splitting

### Risk 3: Framework Selection Accuracy
**Impact**: High
**Probability**: Medium
**Mitigation**: Extensive testing of semantic search, fallback to curated recommendations

---

## Implementation Phases

### Phase 1: Core Sprint Flow (Week 1-2)
- Sprint View component structure
- Basic AI integration with streaming
- Problem intake and diagnostic flow

### Phase 2: Framework Integration (Week 2-3)
- Semantic search implementation
- Framework selection logic
- Interactive workspace for framework application

### Phase 3: Document Generation (Week 3-4)
- Commitment Memo generation
- Export functionality
- Dashboard view for history

### Phase 4: Polish & Optimization (Week 4-5)
- Mobile responsiveness refinement
- Performance optimization
- Accessibility compliance
- Error handling and edge cases

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests for critical paths
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Deployed to staging environment
- [ ] Product owner approval received

---

## Notes

### Design Considerations
- Minimalist aesthetic similar to Notion/Calm
- Focus on reducing cognitive load
- Clear visual hierarchy
- Generous whitespace
- Muted, professional color palette

### Future Enhancements (Post-MVP)
- Collaborative sprints with team members
- Advanced analytics on decision patterns
- Integration with external tools (Slack, Notion)
- Custom framework creation
- AI-powered follow-up reminders

### Technical Debt Considerations
- Consider implementing Redis for caching in future
- May need to optimize embedding search for scale
- WebSocket implementation for real-time collaboration