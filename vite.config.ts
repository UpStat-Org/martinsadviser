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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Conservative chunk strategy: only carve out genuinely independent
        // leaf libraries that don't transitively import React. Splitting
        // React itself (or libraries that share its internals — Radix,
        // floating-ui, react-remove-scroll, etc.) caused module-evaluation
        // crashes ("Cannot read properties of undefined (reading
        // 'useLayoutEffect')") because the resulting chunk graph had
        // circular imports that didn't initialize in the right order.
        //
        // The cost: a larger single `vendor` chunk. The benefit: stable
        // loading, and the React/Radix/Router/Query versions move together
        // anyway, so we don't lose much cache granularity.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Recharts (+ its d3-* deps) — only used on chart routes.
          if (
            id.includes("/recharts/") ||
            id.match(/[/\\]d3-[^/\\]+[/\\]/)
          ) {
            return "vendor-charts";
          }

          // Supabase client — leaf, no UI.
          if (id.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          // Lucide icons — pure SVG components, no internal React-ecosystem
          // dependencies beyond React itself (which loads from the main
          // vendor chunk).
          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }

          // Markdown — react-markdown + remark/rehype/unified ecosystem.
          // Lazy-loaded only inside the AI report dialog.
          if (
            id.includes("/react-markdown/") ||
            id.includes("/remark") ||
            id.includes("/rehype") ||
            id.includes("/unified") ||
            id.includes("/micromark") ||
            id.includes("/mdast") ||
            id.includes("/hast") ||
            id.includes("/vfile") ||
            id.includes("/unist") ||
            id.includes("/bail/") ||
            id.includes("/trough/") ||
            id.includes("/decode-named-character-reference/") ||
            id.includes("/character-entities") ||
            id.includes("/property-information/") ||
            id.includes("/space-separated-tokens/") ||
            id.includes("/comma-separated-tokens/") ||
            id.includes("/zwitch/") ||
            id.includes("/longest-streak/") ||
            id.includes("/ccount/") ||
            id.includes("/escape-string-regexp/")
          ) {
            return "vendor-markdown";
          }

          // Date-fns — leaf, used by formatters across the app.
          if (id.includes("/date-fns/")) {
            return "vendor-date";
          }

          // Everything else — React, ReactDOM, scheduler, Radix, router,
          // TanStack Query, hook-form, zod, cmdk, sonner, next-themes,
          // cva, clsx, tailwind-merge, floating-ui, react-remove-scroll,
          // vaul, embla, day-picker, etc. — ships as one vendor chunk so
          // there are no circular-import surprises at chunk boundaries.
          return "vendor";
        },
      },
    },
  },
}));
