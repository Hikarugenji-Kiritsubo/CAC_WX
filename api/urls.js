import { buildUrls, validateQuery } from "./_lib.js";

export default function handler(req, res) {
  const q = validateQuery(req, res);
  if (!q) return;
  res.status(200).json({ ...q, urls: buildUrls(q.part, q.date) });
}
