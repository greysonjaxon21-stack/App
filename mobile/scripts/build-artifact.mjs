// Packs the Expo web export (dist/) into one self-contained HTML file that can be
// published as a claude.ai artifact: the JS bundle is inlined and every asset
// (icon font, images) becomes a data: URI, since the artifact frame loads nothing else.
//
// Usage: npx expo export --platform web && node scripts/build-artifact.mjs [out.html]
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const out = path.resolve(process.argv[2] ?? "artifact/plately.html");

const jsDir = path.join(dist, "_expo/static/js/web");
const bundles = fs.readdirSync(jsDir).filter((f) => f.endsWith(".js"));
if (bundles.length !== 1) {
  throw new Error(`Expected exactly one web bundle, found ${bundles.length}. Is asyncRoutes disabled for web?`);
}
let js = fs.readFileSync(path.join(jsDir, bundles[0]), "utf8");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".ttf": "font/ttf", ".otf": "font/otf", ".svg": "image/svg+xml" };
const assetRefs = new Set(js.match(/\/assets\/[^"'`\s)]+\.(png|jpg|ttf|otf|svg)/g) ?? []);
for (const ref of assetRefs) {
  const file = path.join(dist, ref);
  if (!fs.existsSync(file)) {
    console.warn(`missing asset ${ref}`);
    continue;
  }
  const uri = `data:${MIME[path.extname(file)]};base64,${fs.readFileSync(file).toString("base64")}`;
  js = js.split(ref).join(uri);
}
// Keep the bundle from closing its own <script> tag.
js = js.split("</script").join("<\\/script");

// The artifact publisher wraps the page in its own <!doctype>/<head>/<body> skeleton,
// so the file holds only the page content.
const html = `<title>Plately</title>
<style>
:root { color-scheme: light; }
html, body { height: 100%; margin: 0; background: #F6F6F8; }
body { overflow: hidden; }
#root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>
// The app routes on the URL path; start it at "/" whatever path the frame was served from.
try { if (location.pathname !== "/") history.replaceState(null, "", "/"); } catch (e) {}
</script>
<script>${js}</script>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${path.relative(process.cwd(), out)} (${(html.length / 1024 / 1024).toFixed(2)} MB, ${assetRefs.size} assets inlined)`);
