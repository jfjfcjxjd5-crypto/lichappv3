import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "Lịch việc & thu chi",
        short_name: "Lịch việc",
        description: "Theo dõi đầu việc và thu chi mỗi ngày trên lịch tháng",
        lang: "vi",
        start_url: "/",
        display: "standalone",
        background_color: "#f5f5f7",
        theme_color: "#0a84ff",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
