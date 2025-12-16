import archiver from "archiver";
import { buildUrls, validateQuery, fetchPdf } from "./_lib.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const q = validateQuery(req, res);
  if (!q) return;

  const list = buildUrls(q.part, q.date);

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="JMA_${q.date.replaceAll("-", "")}_${q.part}.zip"`
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    res.statusCode = 500;
    res.end(`zip error: ${err.message}`);
  });
  archive.pipe(res);

  for (const item of list) {
    try {
      const buf = await fetchPdf(item.url);
      archive.append(buf, { name: item.filename });
    } catch (e) {
      archive.append(
        `${item.label}\n${item.url}\nERROR: ${String(e?.message || e)}\n`,
        { name: `${item.filename}.ERROR.txt` }
      );
    }
  }

  await archive.finalize();
}
