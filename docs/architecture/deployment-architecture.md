# **Deployment Architecture**

## **Deployment Strategy**

- **Frontend:** The Next.js application in `apps/web` will be deployed to **Netlify's Edge Network**.
- **Backend:** API routes and any functions using the Core Engine will be automatically deployed as **Netlify Functions**.
- **CI/CD:** The process will be managed by Netlify's build system, connected directly to the Git repository. Pushes to the `main` branch will trigger a production deployment.

## **Netlify Configuration (`netlify.toml`)**

A basic `netlify.toml` at the root of the monorepo will control the build process.

Ini, TOML

```
[build]
  command = "npm run build"
  publish = "apps/web/.next"

[build.environment]
  # Environment variables can be set here or in Netlify UI

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

---
