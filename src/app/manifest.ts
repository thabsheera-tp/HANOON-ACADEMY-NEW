import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hanoon Academy",
    short_name: "Hanoon",
    description: "Modern Islamic EdTech, Academic Home Tuition & Skill Programs",
    start_url: "/",
    display: "standalone",
    background_color: "#F0FDF4",
    theme_color: "#047857",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
