// utils/formatDate.ts

export function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`; // 2026.01.25
}

export function formatDateTime(iso: string) {
  const d = new Date(iso);

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${yyyy}.${mm}.${dd} ${hh}:${min}`; // 2026.01.25 19:00
}

/** 년월일 시:분 (행사관리 등 표시용, ISO/T 문구 없음) */
export function formatDateTimeKo(iso: string): string {
  if (!iso || !String(iso).trim()) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}년 ${m}월 ${day}일 ${h}:${min}`;
}

/** 행사관리용: 점 구분 년.월.일 시:분 (예: 2026.2.15 3:00) */
export function formatDateTimeAdmin(iso: string): string {
  if (!iso || !String(iso).trim()) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${day} ${h}:${min}`;
}

/** 게시물 목록용: 24시간 이내 → 상대 시간, 이후 → MM.DD (올해 다르면 YYYY.MM.DD) */
export function formatPostListTime(iso?: string): string {
  try {
    if (!iso) return '';
    const d = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + '+09:00');
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 0) return '방금 전';
    if (diff < 60_000) return '방금 전';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
    const today = new Date();
    if (d.getFullYear() === today.getFullYear()) {
      return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, '0')}`;
    }
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

/** 상대 시간 (n분 전 / n시간 전 / n일 전 / n달 전 / n년 전) */
export function formatRelativeTime(iso?: string): string {
  try {
    if (!iso) return '';
    // 타임존 없는 경우 서버 시간을 KST(+09:00)로 간주
    const d = new Date(iso.includes('Z') || iso.includes('+') ? iso : iso + '+09:00');
    if (Number.isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    if (diff < 0) return '방금 전';
    if (diff < 60_000) return '방금 전';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
    if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}일 전`;
    if (diff < 31_536_000_000) return `${Math.floor(diff / 2_592_000_000)}달 전`;
    return `${Math.floor(diff / 31_536_000_000)}년 전`;
  } catch {
    return '';
  }
}

export function formatDateTimeRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);

  const sameDate =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (sameDate) {
    const yyyy = start.getFullYear();
    const mm = String(start.getMonth() + 1).padStart(2, "0");
    const dd = String(start.getDate()).padStart(2, "0");

    const sh = String(start.getHours()).padStart(2, "0");
    const sm = String(start.getMinutes()).padStart(2, "0");
    const eh = String(end.getHours()).padStart(2, "0");
    const em = String(end.getMinutes()).padStart(2, "0");

    return `${yyyy}.${mm}.${dd} ${sh}:${sm} ~ ${eh}:${em}`; // 2026.01.25 19:00 ~ 21:00
  }

  return `${formatDateTime(startIso)} ~ ${formatDateTime(endIso)}`;
}
