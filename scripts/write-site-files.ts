import { writeFileSync } from "node:fs";
import { renderRobotsTxt, renderSitemapXml } from "../site.config.ts";

writeFileSync(new URL("../public/robots.txt", import.meta.url), renderRobotsTxt());
writeFileSync(new URL("../public/sitemap.xml", import.meta.url), renderSitemapXml());
