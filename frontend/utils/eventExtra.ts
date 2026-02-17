import type { EventExtra, EventNewsItem, EventTimelineItem, EventBoothItem } from '../types/event';

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
      result.foodBooths = raw.foodBooths.filter(
        (b): b is EventBoothItem =>
          b != null && typeof b === 'object' && typeof (b as EventBoothItem).id === 'string'
      ) as EventBoothItem[];
    }
    if (Array.isArray(raw.experienceBooths)) {
      result.experienceBooths = raw.experienceBooths.filter(
        (b): b is EventBoothItem =>
          b != null && typeof b === 'object' && typeof (b as EventBoothItem).id === 'string'
      ) as EventBoothItem[];
    }
    return result;
  } catch {
    return {};
  }
}

export function stringifyEventExtra(extra: EventExtra): string {
  return JSON.stringify(extra);
}
