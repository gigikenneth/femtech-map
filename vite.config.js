import { resolve } from "path";
import { defineConfig } from "vite";

// Multi-page: the map (index), the reports index, the report detail view,
// and the contributors page.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        reports: resolve(__dirname, "reports/index.html"),
        report: resolve(__dirname, "report.html"),
        contributors: resolve(__dirname, "contributors/index.html"),
      },
    },
  },
});
