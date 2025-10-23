import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Determine base path for GitHub Pages deployment.
    // It's dynamically set from the GITHUB_REPOSITORY env var during the CI build.
    // For local development, it defaults to '/'.
    const base = process.env.GITHUB_REPOSITORY
      ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
      : '/';

    return {
      base: base, 
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix: `__dirname` is not available in ES modules. Using `import.meta.url` to get the project root.
          '@': fileURLToPath(new URL('.', import.meta.url)),
        }
      }
    };
});
