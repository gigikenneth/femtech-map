import { resolve } from "path";
import { defineConfig } from "vite";

// Multi-page: the map (index), the reports index, the report detail view,
// and the contributors page.
export default defineConfig({
  // ponytail: build date stands in for data date; every data change ships via a build
  define: { __BUILD_DATE__: JSON.stringify(new Date().toISOString()) },
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
