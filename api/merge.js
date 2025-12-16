import { PDFDocument } from "pdf-lib";
import { buildUrls, validateQuery, fetchPdf } from "./_lib.js";

export default async function handler(req, res) {
  const q = validateQuery(req, res);
  if (!q) return;

  const list = buildUrls(q.part, q.date);

  const outDoc = await PDFDocument.create();
  let added = 0;

  for (const item of list) {
    try {
      const buf = await fetchPdf(item.url);
      const src = await PDFDocument.load(buf);
      const pages = await outDoc.copyPages(src, src.getPageIndices());
      pages.forEach((p) => outDoc.addPage(p));
      added++;
    } catch (e) {
      // 取れなかったPDFはスキップ
    }
  }

  if (added === 0) {
    res.status(502).send("No PDFs could be downloaded/merged.");
    return;
  }

  const bytes = await outDoc.save();
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="JMA_${q.date.replaceAll("-", "")}_${q.part}_MERGED.pdf"`
  );
  res.status(200).send(Buffer.from(bytes));
}
