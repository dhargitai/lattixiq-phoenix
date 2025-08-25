# **The Phoenix Framework Product Requirements Document (PRD)**

| Date | Version | Description | Author |
| --- | --- | --- | --- |
| 2025-08-24 | 1.0 | Initial PRD draft creation. | PM (John) |
| 2025-08-24 | 1.1 | Finalized based on collaborative review. | PM (John) |

---

## **1. Goals and Background Context**

### **Goals**

- To create a "painkiller" solution that **breaks the cycle of analysis paralysis** for early-stage startup founders facing a specific, high-stakes decision.
- To provide an interactive, guided experience that measurably increases a founder's **confidence** in their decision-making process.
- To ensure the system's UX is explicitly designed to **reduce user anxiety and cognitive load.**
- To build the product on a **well-separated, testable, and platform-agnostic core architecture** to ensure quality and future flexibility.
- To **validate the core framework quickly** with a targeted group of founders before expanding the feature set.

### **Background Context**

The project began as LattixIQ, a platform for learning mental models. Market research revealed that "learning" is a "vitamin" (nice-to-have), while the target audience of **startup founders** suffers from an acute, urgent "pain" of decision paralysis. This led to the design of "The Phoenix Framework," an interactive decision sprint. The system leverages a dynamic, semantically searchable knowledge base of mental models to guide a founder from a state of chaotic uncertainty to one of confident, committed action.

---

## **2. Requirements**

### **Functional Requirements (FR)**

1. **FR1: Problem Intake:** The user must be able to initiate a "decision sprint" by providing an initial, unstructured "brain dump" of their problem.
2. **FR2: Interactive Diagnostic:** The system must analyze the initial input and conduct an interactive, conversational interview with the user to gather additional context and clarify the core issues.
3. **FR3: Decision Classification:** The system must guide the user through classifying their decision as a **Type 1 (irreversible)** or **Type 2 (reversible)** decision to frame its severity.
4. **FR4: Problem Validation:** The system must generate a concise **"Validated Problem Brief"** and require the user to confirm that it accurately understands the situation before proceeding.
5. **FR5: Advanced Semantic Framework Selection:** Based on the validated brief, the system must perform sophisticated semantic search using vector embeddings (OpenAI text-embedding-3-small) to dynamically select the most effective sequence of mental models and frameworks. The selection algorithm must:
   - Utilize 1536-dimensional vector embeddings for semantic similarity matching
   - Filter by target persona (founder, executive, investor, product_manager)
   - Consider startup phase (ideation, seed, growth, scale-up, crisis)
   - Match against problem categories (pivot, hiring, fundraising, co-founder_conflict, product-market_fit, go-to-market, team_and_culture, operations, competitive_strategy, pricing, risk_management)
   - Prioritize "super model" frameworks for foundational concepts
   - Support multi-pool search strategy with subcategory filtering
   - Implement threshold-based similarity matching with configurable parameters
6. **FR6: Expert Handoff:** The system must present the selected frameworks and a brief rationale for their use as an expert recommendation, then **immediately transition** the user into the guided application of the first framework.
7. **FR7: Interactive Crucible Workspace:** The system must provide an interactive workspace that guides the user step-by-step through the application of the selected frameworks (e.g., Cost-Benefit-Mitigation, Pre-Mortem, Bias Shield).
8. **FR8: Commitment Memo Generation:** Upon completion of the crucible, the system must generate a shareable **"Commitment Memo"** that documents the decision, the rationale, alternatives considered, and risks to be monitored.
9. **FR9: Momentum Ignition:** The system must guide the user to define a small, fast **"Micro-Bet"** (experiment) and the single **"First Domino"** (next physical action) to create immediate forward momentum.
10. **FR10: Decoupled Core Logic:** All core logic for the Phoenix Framework (diagnostics, framework selection, guidance) must be architected in a decoupled manner, separate from the presentation layer, to ensure it is testable and platform-agnostic.
11. **FR11: Comprehensive Knowledge Management System:** The system must maintain a sophisticated knowledge base with:
   - Support for 5 content types: mental-models, cognitive-biases, fallacies, strategic-frameworks, tactical-tools
   - Rich content structure with hook, definition, analogy/metaphor, key takeaway, examples, pitfalls, payoffs
   - Visual metaphor support with AI-generated imagery capabilities
   - Deep-dive content including mechanism explanations, origin stories, and nuanced pitfalls
   - Hierarchical categorization system (5 main categories, 18 subcategories)
   - Multi-language support architecture (initially English)
   - Content versioning and update management
   - Analytics for framework effectiveness and user engagement

### **Non-Functional Requirements (NFR)**

1. **NFR1: Conversational Experience:** The web UI's interaction with the AI must feel like a responsive, real-time conversation, not a series of slow page loads.
2. **NFR2: Modern AI Interface:** The system will use the Vercel AI SDK to enable modern features like streaming text and generative UI elements.
3. **NFR3: User Interface Tech Stack:** The web UI will be built using Next.js and a minimalist component library based on Shadcn/ui and Tailwind CSS.
4. **NFR4: Extensible Knowledge Base:** The system architecture must allow for new mental models and frameworks to be added to the knowledge base without requiring changes to the core application code.

---

## **3. User Interface Design Goals**

### **Overall UX Vision**

The user experience should feel less like using a "tool" and more like engaging in a focused, guided conversation with a calm, expert strategist. The entire flow should be designed to take the user from a state of chaotic overwhelm to one of confident clarity. The aesthetic should be minimalist, clean, and professional, prioritizing focus and readability above all else.

### **Key Interaction Paradigms**

- **One-Thing-at-a-Time:** The interface will present only one question, task, or piece of information at a time to prevent overwhelming the user.
- **Conversational Flow:** Interactions will be driven by a conversational, chat-like interface, using the Vercel AI SDK to stream responses and make the experience feel dynamic and alive.
- **The Living Document:** The outputs (like the "Commitment Memo") should feel like they are being co-created in real-time, not just generated at the end.

### **Core Screens and Views**

Conceptually, the application will have two main areas for the MVP:

1. **The Sprint View:** The primary, full-screen interface where a user is guided through a single "Phoenix Framework" decision sprint from start to finish.
2. **The Dashboard / Hangar:** A central hub where users can see a list of their past decision sprints and review their "Commitment Memos."

### **Accessibility**

- **Standard:** The application will adhere to **WCAG 2.1 AA** standards to ensure it is usable by people with disabilities.

### **Branding**

- **Feel:** The branding should evoke feelings of clarity, confidence, and calm intelligence. The aesthetic is a mix between the clean utility of a tool like **Notion** and the focused, anxiety-reducing feel of an app like **Calm**.
- **Visuals:** Minimalist typography, a muted and professional color palette, and generous use of white space.

### **Target Device and Platforms**

- **Primary:** The initial build will be a **Web Responsive** application, designed mobile-first to ensure a seamless experience on any device.

---

## **4. Technical Assumptions**

### **Repository Structure: Monorepo**

We will use a monorepo structure to manage the codebase.

- **Rationale:** This approach is ideal as it will contain both the core "Phoenix Framework" engine and the Next.js web application in a single repository, simplifying dependency management and encouraging code sharing.

### **Service Architecture: Serverless**

The backend logic will be built as serverless functions, deployed on **Netlify**.

- **Rationale:** A serverless architecture offers automatic scaling, reduces infrastructure management overhead, and is cost-effective. This aligns with the modern, Jamstack-oriented tech stack.

### **Testing Requirements: Unit + Integration**

Our testing strategy will focus on a combination of unit and integration tests.

- **Rationale:** Unit tests will ensure that individual components and functions work correctly in isolation. Integration tests will then verify that the core engine and the web UI communicate as expected.

### **Additional Technical Assumptions and Requests**

- **Framework:** **Next.js** will be used for the web application.
- **AI Integration:** The **Vercel AI SDK** will be used to create the streaming, conversational user interface.
- **UI Components:** We will use **Shadcn/ui** for our base component library and **Vercel's AI Elements** for specialized, AI-native interface components.
- **Styling:** **Tailwind CSS** will be used for all styling.
- **Database & Auth:** **Supabase** will be used for the database and, in a future epic, for user authentication.

---

## **5. Epic List**

### **Epic 1: The Core Engine & Foundational Setup**

- **Goal:** To build and thoroughly test the complete, decoupled logic of the "Phoenix Framework" and establish the foundational monorepo structure, including all necessary tooling and configurations.

### **Epic 2: The Interactive Web Experience (MVP)**

- **Goal:** To build the minimalist, conversational web interface that connects to the core engine, integrating the Vercel AI SDK and AI Elements to deliver the full end-to-end "Phoenix Framework" sprint experience to our first users.

### **Epic 3: User Accounts & Decision History**

- **Goal:** To add user persistence by integrating Supabase for authentication and creating a dashboard where users can save, view, and manage their past "Commitment Memos."