# **API Specification**

The primary user interaction is conversational and will be handled by a streaming API endpoint. Standard REST endpoints will be used for data persistence.

- **Streaming Endpoint:** `POST /api/sprint`
    - **Purpose:** Handles the entire interactive Phoenix Framework session.
    - **Request Body:** An object containing the current state of the conversation and user inputs.
    - **Response:** A streaming UI response managed by the Vercel AI SDK.
- **Data Endpoints:**
    - `GET /api/decisions`: Fetches all `DecisionSprint` records for the authenticated user.
    - `POST /api/decisions`: Saves a completed `DecisionSprint` record.

---
