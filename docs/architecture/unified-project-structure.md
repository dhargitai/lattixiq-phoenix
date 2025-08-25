# **Unified Project Structure**

The project will be structured as a Turborepo monorepo to maintain a clean separation of concerns while enabling easy code sharing.

```
/
├── apps/
│   └── web/                # Next.js frontend application
│       ├── app/
│       ├── components/     # UI components (using DaisyUI)
│       └── ...
├── packages/
│   ├── core/               # The Phoenix Core Engine (decoupled logic)
│   │   └── src/
│   ├── ui/                 # Shared UI components & theme config
│   └── config/             # Shared configurations (ESLint, TypeScript)
└── package.json            # Root package.json
```

---
