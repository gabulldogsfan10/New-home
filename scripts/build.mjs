// Wraps app.html (the page body, as published to Claude) in a full HTML document
// so it can also be opened directly or hosted on GitHub Pages as index.html.
import { readFileSync, writeFileSync } from "node:fs";
const body = readFileSync(new URL("../app.html", import.meta.url), "utf8");
const doc = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
${body}
</body></html>
`;
writeFileSync(new URL("../index.html", import.meta.url), doc);
console.log("Wrote index.html");
