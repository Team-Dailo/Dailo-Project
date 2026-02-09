import { useState, useEffect, useCallback } from 'react';
import type { EventDetail } from '../types/event';
import * as eventService from '../services/event.service';
import * as logService from '../services/log.service';

export function useEventDetail(id: string | undefined, source?: string) {
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await eventService.getEventDetail(id);
      setDetail(data);
      const eventIdNum = Number(id);
      if (Number.isFinite(eventIdNum) && (source ?? 'detail')) {
        logService.logClick({ eventId: eventIdNum, source: source ?? 'detail' }).catch(() => {});
      }
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id, source]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, error, refetch: fetchDetail };
}
