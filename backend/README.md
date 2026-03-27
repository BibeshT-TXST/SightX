# SightX API Middleware (Node.js)

The SightX backend is a lightweight Express-based orchestration layer. Its primary role is to securely handle clinical image uploads from the frontend and coordinate inference requests with the Python AI engine.

## 🛠 Tech Stack
- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Web Framework**: [Express](https://expressjs.com/)
- **File Handling**: [Multer](https://github.com/expressjs/multer) (Memory Storage)
- **HTTP Client**: [Axios](https://axios-http.com/)
- **Containerization**: [Docker](https://www.docker.com/)

## 📖 Developer Guidelines

### Standard Operating Procedures (SOPs)
- **Log Hygiene**: All server-side logs must be prefixed with `[SightX]` for easier filtering in container logs (e.g., `console.log('[SightX] Server started')`).
- **Memory Management**: Images are stored in memory using `multer.memoryStorage()`. Ensure payloads do not exceed the configured limits to prevent heap overflows.
- **Service Communication**: Use Docker internal service names (e.g., `http://inference-engine:8000`) for inter-container communication.

### Do's ✅
- **Use JSDoc**: Document all route handlers and middleware with clear descriptions of their inputs and diagnostic outputs.
- **Relay Errors**: Catch and log detailed errors from the inference engine, but return sanitized, patient-safe messages to the frontend.
- **Keep it Slim**: The backend should remain a pure orchestration layer. Keep heavy clinical logic and post-processing in the Python engine.

### Don'ts ❌
- **Local Storage**: Never persist clinical images to the local filesystem. All image data must remain transient.
- **Hardcoded Secrets**: Never hardcode internal URLs or API keys. Use the `.env` configuration and `process.env`.
- **Global Middleware**: Avoid adding global middleware that could impact the throughput of high-frequency scanning threads.

## 🚀 Execution

1. **Local Development**:
   ```bash
   npm install
   npm run dev # Starts with nodemon
   ```

2. **Production Build**:
   The backend is automatically built as part of the Docker Compose stack.
   ```bash
   docker-compose build backend
   ```

---
© 2026 SightX • Technical Documentation
