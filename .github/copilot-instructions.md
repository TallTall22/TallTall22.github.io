# MLB Field Project - Copilot Instructions

This is a Vue 3 + TypeScript project built with Vite. Use this file to provide custom context to GitHub Copilot for this workspace.

## Project Stack

- **Framework**: Vue 3
- **Language**: TypeScript
- **Build Tool**: Vite
- **Package Manager**: npm

## Code Style Guidelines

- Use TypeScript for all source files
- Use composition API with `<script setup>` syntax in Vue components
- Follow component naming conventions: PascalCase for components
- Use interfaces/types for all props and emits
- Maintain consistent code formatting

## Project Structure

```
src/
├── components/     # Reusable Vue components
├── views/         # Page components
├── App.vue        # Root component
└── main.ts        # Application entry point
public/           # Static assets
dist/            # Build output (generated)
```

## Common Tasks

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run linter (if configured)

## Copilot Guidelines

When suggesting code:

1. Always use TypeScript strict mode
2. Suggest Vue 3 Composition API with `<script setup>` syntax
3. Include proper type annotations for props and emits
4. Suggest appropriate components structure
5. Consider performance and accessibility
