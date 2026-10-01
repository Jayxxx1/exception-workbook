import { writeFileSync } from "node:fs";
import { assertProductionOrigin, renderRobotsTxt, renderSitemapXml, resetSiteOriginCache } from "../site.config.ts";

resetSiteOriginCache();
const origin = assertProductionOrigin();
writeFileSync(new URL("../public/robots.txt", import.meta.url), renderRobotsTxt(origin));
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), renderSitemapXml(origin));
console.log(`Wrote robots.txt and sitemap.xml for ${origin}`);
