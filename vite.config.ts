import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AT Disruption Hub — client-side prototype only. No backend, no proxy.
export default defineConfig({
  plugins: [react()],
});
