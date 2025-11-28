export function parseLine(l: string) {
  if (!l) return { code: "", comment: "" };
  const idx = l.indexOf(";");
  if (idx === -1) return { code: l.trim(), comment: "" };
  return {
    code: l.substring(0, idx).trim(),
    comment: l.substring(idx + 1).trim(),
  };
}
