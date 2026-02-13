// utils/formatTime.ts

export function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`; // 19:00
}

export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatTime(startIso)} ~ ${formatTime(endIso)}`; // 19:00 ~ 21:00
}
