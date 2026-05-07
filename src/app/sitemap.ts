import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${SITE_URL}/`,         lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE_URL}/dex`,      lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${SITE_URL}/history`,  lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    { url: `${SITE_URL}/insights`, lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    { url: `${SITE_URL}/settings`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];
}
