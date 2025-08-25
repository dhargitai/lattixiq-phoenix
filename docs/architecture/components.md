# **Components**

The system is composed of four major logical components:

1. **Phoenix Core Engine (TypeScript Package):** A UI-agnostic library containing all business logic for the Phoenix Framework. It takes user input and conversation state, calls AI models, and returns structured output.
2. **Web UI (Next.js Application):** The user-facing presentation layer. It manages the conversational UI, renders components, and handles client-side state.
3. **API Layer (Netlify Functions):** A set of serverless functions that serve as the bridge between the Web UI, the Core Engine, and Supabase.
4. **Database (Supabase):** The persistence layer for user data and decision sprints.

---
