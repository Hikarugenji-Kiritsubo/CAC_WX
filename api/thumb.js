import { createCanvas } from "@napi-rs/canvas";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// Node向け（legacy）を require で読むのが安定
const pdfjs = require("pdfjs-dist/legacy/build/pdf.js");

const ALLOW_HOSTS = new Set([
  "www.jma.go.jp",
  "jma.go.jp",
  "www.data.jma.go.jp",
  "data.jma.go.jp",
]);

async function fetchPdfUint8(url) {
  const r = await fetch(url, { headers: { "User-Agent": "CAC_WX thumb" } });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const ab = await r.arrayBuffer();
  return new Uint8Array(ab);
}

export default async function handler(req, res) {
  const u = req.query.u;
  if (!u) return res.status(400).send("missing u");

  let target;
  try { target = new URL(u); } catch { return res.status(400).send("invalid url"); }

  if (target.protocol !== "https:" || !ALLOW_HOSTS.has(target.hostname)) {
    return res.status(403).send("forbidden");
  }

  try {
    const pdfData = await fetchPdfUint8(target.toString());

    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // サムネサイズ
    const targetWidth = 900;
    const viewport1 = page.getViewport({ scale: 1 });
    const scale = targetWidth / viewport1.width;
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    const png = canvas.toBuffer("image/png");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(png);
  } catch (e) {
    // 失敗理由をログに出す（Vercelの Functions Logs で見える）
    console.error("thumb error:", e?.stack || e);
    res.status(502).send("thumb failed");
  }
}
