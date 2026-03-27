# SightX Professional Clinical Frontend

The SightX frontend is a high-performance, clinical-grade React application designed for retinal scan diagnostics. It prioritizes data integrity, visual excellence, and medical-grade reliability.

## 🛠 Tech Stack
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **UI Components**: [Material UI (MUI)](https://mui.com/)
- **State & Auth**: [Supabase](https://supabase.com/)
- **Icons**: [MUI Icons](https://mui.com/material-ui/material-icons/)
- **Typography**: [Inter](https://rsms.me/inter/) (Variable Typeface)

## 📖 Developer Guidelines

### Standard Operating Procedures (SOPs)
- **Component Documentation**: Every component MUST include a JSDoc header describing its purpose and clinical context.
- **Styling Architecture**: Use MUI's `sx` prop for component-level styling. Group properties logically (Layout → Spacing → Borders → Effects).
- **Theming**: Adhere to the design tokens defined in `src/theme/index.js`. Use tonal layering and depth instead of harsh borders ("The No-Line Rule").
- **Authentication**: Always use the `useAuth` hook for user state. Never bypass `ProtectedRoute` for clinical views.

### Do's ✅
- **Use Semantic HTML**: Ensure all interactive elements have descriptive IDs for clinical audits and testing.
- **Maintain Glassmorphism**: For deep-UI elements (like scan overlays), use `backdropFilter: 'blur(20px)'` with subtle opacities (`0.7` - `0.9`).
- **One-Liner Comments**: Provide concise explanations for non-obvious clinical or scan logic.

### Don'ts ❌
- **Ad-hoc CSS**: Avoid mixing vanilla CSS or external libraries unless explicitly required for specialized animations.
- **Bypass Prop-Drilling**: Use the `AuthContext` or localized contexts for state management; avoid deep prop drilling in large layouts.
- **Placeholders**: Never use placeholder images or text. Use the provided assets or generate appropriate clinical mockups.

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are defined in your `.env`.

3. **Launch Clinical Console**:
   ```bash
   npm run dev
   ```

---
© 2026 SightX Clinical Systems • Technical Documentation
