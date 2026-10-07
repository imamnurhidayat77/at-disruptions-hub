import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sapProxyPlugin } from './server/sapProxy.js';

// AT Disruption Hub — Vite SPA plus a dev-only, server-side SAP proxy.
// SAP_API_* env values are read here (Node side) and never bundled.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), sapProxyPlugin(env)],
  };
});
