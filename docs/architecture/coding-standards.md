# **Coding Standards**

1. **Strict Decoupling:** The `packages/core` engine **must not** contain any React or DOM-specific code. It should be pure TypeScript.
2. **Type Sharing:** All shared data structures (e.g., `DecisionSprint`) should be defined in `packages/core` and imported by the `apps/web` application to ensure type safety.
3. **State Management:** All client-side state in the web app will be managed with **Zustand**. Avoid prop-drilling.
4. **Styling:** All components will be styled using **Tailwind CSS** and **DaisyUI** classes. Avoid custom CSS files where possible.