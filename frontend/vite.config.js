import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The Base44 Vite plugin used to provide the "@/*" -> "src/*" alias
    // (see jsconfig.json). Replaced here now that plugin is gone.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
