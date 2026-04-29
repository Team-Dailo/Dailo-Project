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

/** 상대 시간 표시
 * - 5분 이내: 방금 전
 * - 1시간 이내: N분 전
 * - 오늘 내 1시간 이상: N시간 전
 * - 어제~6일: N일 전
 * - 7일~: N주 전
 * - 4주~: N달 전
 * - 12달~: N년 전
 */
export function formatRelativeTime(iso?: string): string {
  try {
    if (!iso) return '';

    // 서버가 KST로 보내므로 타임존 없으면 KST(+09:00)로 해석
    let d: Date;
    if (iso.includes('Z') || iso.includes('+') || iso.includes('-', 10)) {
      d = new Date(iso);
    } else {
      d = new Date(iso + '+09:00');
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    // 음수(미래)는 "방금 전"으로 표시 (서버 시간 오차 허용)
    if (diffMs < 0) return '방금 전';

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    // 5분 이내: 방금 전
    if (diffMinutes < 5) return '방금 전';

    // 1시간 이내: N분 전
    if (diffMinutes < 60) return `${diffMinutes}분 전`;

    // 날짜 비교를 위해 자정 기준 계산
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((todayStart.getTime() - targetDate.getTime()) / 86400000);

    // 오늘 (자정 이전): N시간 전
    if (diffDays === 0) {
      return `${diffHours}시간 전`;
    }

    // 1~6일 전: N일 전
    if (diffDays < 7) {
      return `${diffDays}일 전`;
    }

    // 7일 이상 ~ 4주 미만: N주 전
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return `${diffWeeks}주 전`;
    }

    // 4주 이상 ~ 12달 미만: N달 전
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}달 전`;
    }

    // 12달 이상: N년 전
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}년 전`;
  } catch {
    return '';
  }
}

/** 채팅용 시간 표시
 * - 당일: 오전/오후 H:MM (예: 오후 3:45)
 * - 1~6일 전: N일 전
 * - 7일~4주 미만: N주 전
 * - 4주~12달 미만: N달 전
 * - 12달 이상: N년 전
 */
export function formatChatTime(iso?: string): string {
  try {
    if (!iso) return '';

    // 서버가 KST로 보내므로 타임존 없으면 KST(+09:00)로 해석
    let d: Date;
    if (iso.includes('Z') || iso.includes('+') || iso.includes('-', 10)) {
      d = new Date(iso);
    } else {
      d = new Date(iso + '+09:00');
    }
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();

    if (diffMs < 0) return '방금 전';

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((todayStart.getTime() - targetDate.getTime()) / 86400000);

    // 당일: 오전/오후 H:MM 형식
    if (diffDays === 0) {
      const hours = d.getHours();
      const minutes = d.getMinutes();
      const period = hours < 12 ? '오전' : '오후';
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const displayMinutes = String(minutes).padStart(2, '0');
      return `${period} ${displayHours}:${displayMinutes}`;
    }

    // 1~6일 전: N일 전
    if (diffDays < 7) {
      return `${diffDays}일 전`;
    }

    // 7일 이상 ~ 4주 미만: N주 전
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return `${diffWeeks}주 전`;
    }

    // 4주 이상 ~ 12달 미만: N달 전
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) {
      return `${diffMonths}달 전`;
    }

    // 12달 이상: N년 전
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears}년 전`;
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
