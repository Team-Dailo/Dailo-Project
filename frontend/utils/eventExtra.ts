import type { EventExtra, EventNewsItem, EventTimelineItem, EventBoothItem, BoothAreaLocation } from '../types/event';

/** 부스 객체 정규화 (id가 숫자로 저장된 경우도 문자열로 통일) */
function normalizeBoothItem(raw: Record<string, unknown>, type: 'food' | 'experience'): EventBoothItem {
  const id = raw.id != null ? String(raw.id) : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  return {
    id,
    name,
    type,
    locationLabel: typeof raw.locationLabel === 'string' ? raw.locationLabel : undefined,
    time: typeof raw.time === 'string' ? raw.time : undefined,
    host: typeof raw.host === 'string' ? raw.host : undefined,
    menu: Array.isArray(raw.menu) ? raw.menu.map((m) => String(m)) : undefined,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    rules: Array.isArray(raw.rules) ? raw.rules.map((r) => String(r)) : undefined,
    prizes: Array.isArray(raw.prizes) ? raw.prizes.map((p) => String(p)) : undefined,
    externalLink: typeof raw.externalLink === 'string' ? raw.externalLink : undefined,
  };
}

export function parseEventExtra(extraJson: string | null | undefined): EventExtra {
  if (!extraJson || typeof extraJson !== 'string' || !extraJson.trim()) {
    return {};
  }
  try {
    const raw = JSON.parse(extraJson) as Record<string, unknown>;
    const result: EventExtra = {};
    if (Array.isArray(raw.news)) {
      result.news = raw.news.filter(
        (n): n is EventNewsItem =>
          n != null && typeof n === 'object' && typeof (n as EventNewsItem).id === 'string'
      ) as EventNewsItem[];
    }
    if (Array.isArray(raw.timeline)) {
      result.timeline = raw.timeline.filter(
        (t): t is EventTimelineItem =>
          t != null && typeof t === 'object' && typeof (t as EventTimelineItem).id === 'string'
      ) as EventTimelineItem[];
    }
    if (Array.isArray(raw.foodBooths)) {
      result.foodBooths = raw.foodBooths
        .filter((b) => b != null && typeof b === 'object' && (b as EventBoothItem).name != null)
        .map((b) => normalizeBoothItem(b as Record<string, unknown>, 'food')) as EventBoothItem[];
    }
    if (Array.isArray(raw.experienceBooths)) {
      result.experienceBooths = raw.experienceBooths
        .filter((b) => b != null && typeof b === 'object' && (b as EventBoothItem).name != null)
        .map((b) => normalizeBoothItem(b as Record<string, unknown>, 'experience')) as EventBoothItem[];
    }
    const foodAreaRaw = raw.foodArea;
    if (foodAreaRaw != null && typeof foodAreaRaw === 'object' && typeof (foodAreaRaw as BoothAreaLocation).latitude === 'number' && typeof (foodAreaRaw as BoothAreaLocation).longitude === 'number') {
      result.foodArea = foodAreaRaw as BoothAreaLocation;
    }
    const experienceAreaRaw = raw.experienceArea;
    if (experienceAreaRaw != null && typeof experienceAreaRaw === 'object' && typeof (experienceAreaRaw as BoothAreaLocation).latitude === 'number' && typeof (experienceAreaRaw as BoothAreaLocation).longitude === 'number') {
      result.experienceArea = experienceAreaRaw as BoothAreaLocation;
    }
    return result;
  } catch {
    return {};
  }
}

export function stringifyEventExtra(extra: EventExtra): string {
  return JSON.stringify(extra);
}
