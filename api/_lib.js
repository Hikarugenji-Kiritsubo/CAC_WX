export const FIXED = [
  ["AUPQ78 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/aupq78_12.pdf"],
  ["AUPQ35 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/aupq35_12.pdf"],
  ["AXFE578 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/axfe578_12.pdf"],
  ["FXFE502 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/fxfe502_12.pdf"],
  ["FXFE5782 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/fxfe5782_12.pdf"],
  ["FXJP854 (1200UTC)", "https://www.jma.go.jp/bosai/numericmap/data/nwpmap/fxjp854_12.pdf"]
];

function pad2(n) { return String(n).padStart(2, "0"); }

export function makeAsas(dateObjUTC, hhmm) {
  const y = dateObjUTC.getUTCFullYear();
  const m = pad2(dateObjUTC.getUTCMonth() + 1);
  const d = pad2(dateObjUTC.getUTCDate());
  const ym = `${y}${m}`;
  const ymd = `${y}${m}${d}`;
  return `https://www.data.jma.go.jp/yoho/data/wxchart/quick/${ym}/ASAS_MONO_${ymd}${hhmm}.pdf`;
}

export function buildUrls(part, dateStr) {
  const [Y, M, D] = dateStr.split("-").map(Number);
  const selected = new Date(Date.UTC(Y, M - 1, D));
  const prev = new Date(selected);
  prev.setUTCDate(prev.getUTCDate() - 1);

  const urls = [];
  urls.push(["ASAS (前日 1200UTC)", makeAsas(prev, "1200")]);

  if (part === "AM") {
    urls.push(["ASAS (前日 1800UTC)", makeAsas(prev, "1800")]);
  } else {
    urls.push(["ASAS (当日 0000UTC)", makeAsas(selected, "0000")]);
  }

  urls.push(...FIXED);
  return urls.map(([label, url]) => ({ label, url, filename: url.split("/").pop() }));
}

export function validateQuery(req, res) {
  const part = (req.query.part || "AM").toUpperCase();
  const date = req.query.date;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date is required: YYYY-MM-DD" });
    return null;
  }
  if (!["AM", "PM"].includes(part)) {
    res.status(400).json({ error: "part must be AM or PM" });
    return null;
  }
  return { part, date };
}

export async function fetchPdf(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
  const ab = await r.arrayBuffer();
  return Buffer.from(ab);
}
