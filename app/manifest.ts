import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AreBet — Smart Betting. Simple Insights.",
    short_name: "AreBet",
    description: "Smart football betting intelligence platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#22c55e",
    icons: [
      {
        src: "/arebet-logo.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/arebet-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/arebet-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
