import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const ALLOW_HOSTS = new Set([
  "www.jma.go.jp",
  "jma.go.jp",
  "www.data.jma.go.jp",
  "data.jma.go.jp"
]);

async function fetchPdfBuffer(url) {
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
    // PDF取得
    const pdfData = await fetchPdfBuffer(target.toString());

    // PDF読み込み
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    // サムネサイズ（横幅固定）
    const targetWidth = 900; // 画質/サイズのバランス（軽め）
    const viewport1 = page.getViewport({ scale: 1 });
    const scale = targetWidth / viewport1.width;
    const viewport = page.getViewport({ scale });

    // 描画
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;

    const png = canvas.toBuffer("image/png");

    // キャッシュ（同じURLは1時間キャッシュ）
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.status(200).send(png);
  } catch (e) {
    res.status(502).send("thumb failed");
  }
}
