import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DevTrace Candidate Assessment",
    short_name: "DevTrace",
    description: "Student & Candidate Behavioral Assessment Coding Platform",
    start_url: "/login",
    display: "standalone",
    background_color: "#0f1117",
    theme_color: "#0f1117",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
