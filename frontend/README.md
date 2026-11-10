# SightX Professional Clinical Frontend

The SightX frontend is a React application designed for retinal scan diagnostics. It prioritizes data integrity, visual excellence, and medical-grade reliability. In V2 it is an open trial: no sign-in, hosted on S3 behind CloudFront.

## 🛠 Tech Stack
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **UI Components**: [Material UI (MUI)](https://mui.com/)
- **Backend Access**: `src/lib/api.js` (SightX HTTP API) and `src/lib/session.js` (anonymous trial session)
- **Icons**: [MUI Icons](https://mui.com/material-ui/material-icons/)
- **Typography**: [Inter](https://rsms.me/inter/) (Variable Typeface)

## 🔄 How a Scan Flows Through the UI
1. **Patient details first**: name and ID are entered before upload, so the scan joins the patient's history.
2. **Upload**: `createScan()` creates the job and returns a presigned POST; `uploadScan()` sends the image straight to S3.
3. **Live status**: `waitForJob()` polls the job every 2 seconds through *uploading → waiting for the worker → grading*, then keeps listening briefly for the Bedrock suggestion.
4. **Decision**: `recordDecision()` saves the final diagnosis once.
5. **History**: the Accounts page lists the session's scans; **Start New Session** switches to a fresh, empty session.

## 📖 Developer Guidelines

### Standard Operating Procedures (SOPs)
- **Component Documentation**: Every component MUST include a JSDoc header describing its purpose and clinical context.
- **Styling Architecture**: Use MUI's `sx` prop for component-level styling. Group properties logically (Layout → Spacing → Borders → Effects).
- **Theming**: Adhere to the design tokens defined in `src/theme/index.js`. Use tonal layering and depth instead of harsh borders ("The No-Line Rule").
- **Data Access**: Always go through `src/lib/api.js`, which attaches the trial session header and turns failures into readable messages. Never call `fetch` against the API directly from a page.

### Do's ✅
- **Use Semantic HTML**: Ensure all interactive elements have descriptive IDs for clinical audits and testing.
- **Maintain Glassmorphism**: For deep-UI elements (like scan overlays), use `backdropFilter: 'blur(20px)'` with subtle opacities (`0.7` - `0.9`).
- **One-Liner Comments**: Provide concise explanations for non-obvious clinical or scan logic.
- **Show Errors on the Page**: Surface API errors to the user, not only to the console.

### Don'ts ❌
- **Ad-hoc CSS**: Avoid mixing vanilla CSS or external libraries unless explicitly required for specialized animations.
- **Deep Prop-Drilling**: Use localized contexts for shared state; avoid deep prop drilling in large layouts.
- **Placeholders**: Never use placeholder images or text. Use the provided assets or generate appropriate clinical mockups.
- **Real Patient Data**: The trial UI must keep reminding users to enter made-up details only.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm ci
   ```

2. **Environment Setup**: copy `.env.example` to `.env.local` and set `VITE_API_URL` to the deployed HTTP API (`terraform output -raw api_url` in `infrastructure/`). Vite bakes it into the build.

3. **Launch Clinical Console**:
   ```bash
   npm run dev
   ```
   `http://localhost:5173` is allowed by the API's CORS settings by default.

4. **Check before committing** (CI runs the same):
   ```bash
   npm run lint && npm run build
   ```

5. **Deploy**: build and sync `dist/` to the frontend bucket, then invalidate `/index.html`; see [infrastructure/README.md](../infrastructure/README.md#7-deploy-the-frontend).

---
© 2026 SightX • Technical Documentation
