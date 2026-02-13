/**
 * 체류 세션(참여한 축제/체류 미션) 날짜·시간 파싱 (백엔드 LocalDateTime: ISO 문자열 또는 [y,mo,d,h,min,s])
 */

function toDate(isoOrArray: string | number[] | null | undefined): Date | null {
  if (isoOrArray == null) return null;
  if (typeof isoOrArray === "string") {
    const d = new Date(isoOrArray);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  if (Array.isArray(isoOrArray)) {
    const [y, mo, d, h, min, s] = isoOrArray;
    const date = new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h ?? 0),
      Number(min ?? 0),
      Number(s ?? 0)
    );
    return Number.isFinite(date.getTime()) ? date : null;
  }
  return null;
}

/** 참여일: 2026.02.20 (금) */
export function formatSessionDate(isoOrArray: string | number[] | null | undefined): string {
  const d = toDate(isoOrArray);
  if (!d) return "-";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const week = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${y}.${mo}.${day} (${week})`;
}

/** 시간만: 14:30 */
export function formatSessionTime(isoOrArray: string | number[] | null | undefined): string {
  const d = toDate(isoOrArray);
  if (!d) return "-";
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** 날짜+시간: 2026.02.20 14:30 */
export function formatSessionDateTime(isoOrArray: string | number[] | null | undefined): string {
  const d = toDate(isoOrArray);
  if (!d) return "-";
  const date = formatSessionDate(isoOrArray);
  const time = formatSessionTime(isoOrArray);
  return date !== "-" && time !== "-" ? `${date} ${time}` : "-";
}

/** 체류 시간: 35분 / 1시간 5분 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
