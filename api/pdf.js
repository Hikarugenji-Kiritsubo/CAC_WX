const ALLOW_HOSTS = new Set([
  "www.jma.go.jp",
  "jma.go.jp",
  "www.data.jma.go.jp",
  "data.jma.go.jp"
]);

export default async function handler(req, res) {
  const u = req.query.u;
  if (!u) {
    res.status(400).send("missing u");
    return;
  }

  let target;
  try {
    target = new URL(u);
  } catch {
    res.status(400).send("invalid url");
    return;
  }

  if (target.protocol !== "https:" || !ALLOW_HOSTS.has(target.hostname)) {
    res.status(403).send("forbidden");
    return;
  }

  try {
    const r = await fetch(target.toString(), {
      headers: { "User-Agent": "CAC_WX preview proxy" }
    });

    if (!r.ok) {
      res.status(r.status).send(`upstream error: ${r.status}`);
      return;
    }

    const ab = await r.arrayBuffer();

    // CORS（ブラウザからPDF.jsで読めるように）
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // できるだけキャッシュ（表示が速くなる）
    res.setHeader("Cache-Control", "public, max-age=3600");

    res.setHeader("Content-Type", "application/pdf");
    res.status(200).send(Buffer.from(ab));
  } catch (e) {
    res.status(502).send("proxy fetch failed");
  }
}
