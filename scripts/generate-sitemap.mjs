import { writeFile } from "node:fs/promises";
import { pages, siteUrl, lastmod } from "./site-pages.mjs";

const entries = pages.map(({ path, priority }) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

await writeFile(new URL("../sitemap.xml", import.meta.url), xml, "utf8");
console.log(`Generated sitemap.xml with ${pages.length} URLs.`);
