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
    // Bump the warning ceiling — the largest chunk after splitting is the
    // (lazy-loaded) Recharts module, and warning at 500 KB just adds noise.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Pin third-party libraries to dedicated chunks so a route change
        // doesn't re-download what every page already needs. These chunks
        // get long-lived browser cache because their hash only changes
        // when the dependency itself does.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // React + router travel together — separating them just means
          // two waterfall requests instead of one.
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router") ||
            id.includes("/scheduler/") ||
            id.includes("/react-router-dom/")
          ) {
            return "vendor-react";
          }

          // Charts — heavy and only used on dashboard / reports / finance.
          if (id.includes("/recharts/") || id.includes("/d3-")) {
            return "vendor-charts";
          }

          // Supabase client + auth + realtime — used by almost every page.
          if (id.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          // Radix primitives (shadcn/ui foundation).
          if (id.includes("/@radix-ui/")) {
            return "vendor-radix";
          }

          // TanStack Query — global, used by every hook.
          if (id.includes("/@tanstack/")) {
            return "vendor-query";
          }

          // Forms / validation.
          if (
            id.includes("/react-hook-form/") ||
            id.includes("/@hookform/") ||
            id.includes("/zod/")
          ) {
            return "vendor-forms";
          }

          // Date utilities.
          if (id.includes("/date-fns/")) {
            return "vendor-date";
          }

          // Icons — Lucide tree-shakes per-icon, but a small shared chunk
          // still helps when many routes use the same icon set.
          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }

          // Markdown — only the AI report dialog uses this. Keep it in its
          // own chunk so the lazy boundary in ClientDetail actually wins.
          if (id.includes("/react-markdown/") || id.includes("/remark-") || id.includes("/rehype-") || id.includes("/unified/") || id.includes("/micromark") || id.includes("/mdast-") || id.includes("/hast-") || id.includes("/vfile") || id.includes("/unist-")) {
            return "vendor-markdown";
          }

          // Command palette (cmdk) — only opens on Cmd+K, paired with the
          // matching shadcn wrapper. Stays out of the first-paint bundle.
          if (id.includes("/cmdk/")) {
            return "vendor-cmdk";
          }

          // Toast library (sonner). Used app-wide but compact.
          if (id.includes("/sonner/")) {
            return "vendor-toast";
          }

          // Theme handling (next-themes). Tiny, but pinning it makes the
          // vendor-misc bucket easier to read.
          if (id.includes("/next-themes/")) {
            return "vendor-theme";
          }

          // Embla carousel + drawer + resizable panels + otp + day-picker —
          // each only used on a single page (or not at all in core flow).
          // Bucketing them together keeps them out of vendor-misc without
          // creating four 5-KB chunks for no reason.
          if (
            id.includes("/embla-carousel") ||
            id.includes("/vaul/") ||
            id.includes("/react-resizable-panels/") ||
            id.includes("/input-otp/") ||
            id.includes("/react-day-picker/")
          ) {
            return "vendor-widgets";
          }

          // Class-name helpers + small utilities (clsx, cva, tailwind-merge).
          // Used by every component — but they're tiny, so a dedicated chunk
          // means the vendor-misc one only has true edge-case libs left.
          if (
            id.includes("/clsx/") ||
            id.includes("/class-variance-authority/") ||
            id.includes("/tailwind-merge/") ||
            id.includes("/tailwindcss-animate/")
          ) {
            return "vendor-style-utils";
          }

          // Everything else lands here. After all the rules above this
          // bucket should only carry truly miscellaneous transitive deps.
          return "vendor-misc";
        },
      },
    },
  },
}));
