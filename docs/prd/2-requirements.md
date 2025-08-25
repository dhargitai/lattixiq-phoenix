# **2. Requirements**

## **Functional Requirements (FR)**

1. **FR1: Problem Intake:** The user must be able to initiate a "decision sprint" by providing an initial, unstructured "brain dump" of their problem.
2. **FR2: Interactive Diagnostic:** The system must analyze the initial input and conduct an interactive, conversational interview with the user to gather additional context and clarify the core issues.
3. **FR3: Decision Classification:** The system must guide the user through classifying their decision as a **Type 1 (irreversible)** or **Type 2 (reversible)** decision to frame its severity.
4. **FR4: Problem Validation:** The system must generate a concise **"Validated Problem Brief"** and require the user to confirm that it accurately understands the situation before proceeding.
5. **FR5: Dynamic Framework Selection:** Based on the validated brief, the system must perform a dynamic semantic search of its knowledge base to select the most effective sequence of mental models and frameworks for the specific problem.
6. **FR6: Expert Handoff:** The system must present the selected frameworks and a brief rationale for their use as an expert recommendation, then **immediately transition** the user into the guided application of the first framework.
7. **FR7: Interactive Crucible Workspace:** The system must provide an interactive workspace that guides the user step-by-step through the application of the selected frameworks (e.g., Cost-Benefit-Mitigation, Pre-Mortem, Bias Shield).
8. **FR8: Commitment Memo Generation:** Upon completion of the crucible, the system must generate a shareable **"Commitment Memo"** that documents the decision, the rationale, alternatives considered, and risks to be monitored.
9. **FR9: Momentum Ignition:** The system must guide the user to define a small, fast **"Micro-Bet"** (experiment) and the single **"First Domino"** (next physical action) to create immediate forward momentum.
10. **FR10: Decoupled Core Logic:** All core logic for the Phoenix Framework (diagnostics, framework selection, guidance) must be architected in a decoupled manner, separate from the presentation layer, to ensure it is testable and platform-agnostic.

## **Non-Functional Requirements (NFR)**

1. **NFR1: Conversational Experience:** The web UI's interaction with the AI must feel like a responsive, real-time conversation, not a series of slow page loads.
2. **NFR2: Modern AI Interface:** The system will use the Vercel AI SDK to enable modern features like streaming text and generative UI elements.
3. **NFR3: User Interface Tech Stack:** The web UI will be built using Next.js and a minimalist component library based on Shadcn/ui and Tailwind CSS.
4. **NFR4: Extensible Knowledge Base:** The system architecture must allow for new mental models and frameworks to be added to the knowledge base without requiring changes to the core application code.

---
