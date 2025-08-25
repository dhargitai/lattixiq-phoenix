# **4. Technical Assumptions**

## **Repository Structure: Monorepo**

We will use a monorepo structure to manage the codebase.

- **Rationale:** This approach is ideal as it will contain both the core "Phoenix Framework" engine and the Next.js web application in a single repository, simplifying dependency management and encouraging code sharing.

## **Service Architecture: Serverless**

The backend logic will be built as serverless functions, deployed on **Netlify**.

- **Rationale:** A serverless architecture offers automatic scaling, reduces infrastructure management overhead, and is cost-effective. This aligns with the modern, Jamstack-oriented tech stack.

## **Testing Requirements: Unit + Integration**

Our testing strategy will focus on a combination of unit and integration tests.

- **Rationale:** Unit tests will ensure that individual components and functions work correctly in isolation. Integration tests will then verify that the core engine and the web UI communicate as expected.

## **Additional Technical Assumptions and Requests**

- **Framework:** **Next.js** will be used for the web application.
- **AI Integration:** The **Vercel AI SDK** will be used to create the streaming, conversational user interface.
- **UI Components:** We will use **Shadcn/ui** for our base component library and **Vercel's AI Elements** for specialized, AI-native interface components.
- **Styling:** **Tailwind CSS** will be used for all styling.
- **Database & Auth:** **Supabase** will be used for the database and, in a future epic, for user authentication.

---
