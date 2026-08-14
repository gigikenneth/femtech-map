import { resolve } from "path";
import { defineConfig } from "vite";

// Multi-page: the map (index), the reports index, and the report detail view.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        reports: resolve(__dirname, "reports/index.html"),
        report: resolve(__dirname, "report.html"),
      },
    },
  },
});
