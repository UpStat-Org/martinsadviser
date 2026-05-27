import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
  build: {
    // Bump the warning ceiling — without manualChunks the auto-generated
    // vendor chunk approaches ~1 MB raw. That is expected for a CRM with
    // React + Radix + Supabase + TanStack Query + Recharts and is gated
    // behind gzip + HTTP/2 multiplexing in practice.
    chunkSizeWarningLimit: 1200,

    // We intentionally do NOT define `rollupOptions.output.manualChunks`.
    //
    // Two earlier attempts at manual chunking produced runtime crashes:
    //   • Splitting React, Radix, charts, etc. into dedicated vendor
    //     chunks caused TDZ errors like "Cannot access 'A' before
    //     initialization" because libraries share transitive deps Rollup
    //     could not cleanly partition.
    //   • Even a minimal split that only carved out `vendor-markdown`
    //     ended up re-pulled by the entry chunk because Rollup tracked
    //     a shared dep into the markdown bucket.
    //
    // The route-level `React.lazy` boundaries in src/App.tsx and the
    // dialog-level lazy splits in ClientDetail / TruckDetail / PermitDetail
    // already do the bulk of the work. Rollup's default shared-chunk
    // extraction takes care of the rest — recharts naturally lands in a
    // shared async chunk reachable only from the chart routes, xlsx only
    // loads on import dialogs, and so on.
  },
}));
