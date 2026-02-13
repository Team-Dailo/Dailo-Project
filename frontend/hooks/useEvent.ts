import { useState, useEffect, useCallback } from 'react';
import type { EventDetail, Event } from '../types/event';
import type { EventListSort } from '../services/event.service';
import * as eventService from '../services/event.service';
import * as logService from '../services/log.service';

/** 인기순(좋아요 순) 행사 - 홈 캐러셀용 */
export function usePopularEvents(size: number = 3) {
  const [events, setEvents] = useState<eventService.PopularEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventService.getPopularEvents(size);
      setEvents(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [size]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { events, loading, error, refetch: fetchList };
}

/** 행사 목록 (홈·행사 리스트 화면). sort: trending(7일 조회수) | views(30일 조회수) | popular(좋아요) */
export function useEventList(params?: { page?: number; size?: number; sort?: EventListSort }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventService.getEventList({
        page: params?.page ?? 1,
        size: params?.size ?? 50,
        sort: params?.sort ?? null,
      });
      setEvents(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [params?.page, params?.size, params?.sort]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { events, loading, error, refetch: fetchList };
}

/** 인기 클릭 행사 (클릭 로그 기반) - ID 목록 조회 후 상세로 채움 */
export function useTopClickedEvents(limit = 5) {
  const [events, setEvents] = useState<EventDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await logService.getTopClickedEventIds(limit);
      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      const details = await Promise.all(
        ids.map((id) =>
          eventService.getEventDetail(String(id)).catch(() => null)
        )
      );
      setEvents(details.filter((d): d is EventDetail => d != null));
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { events, loading, error, refetch: fetchList };
}

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
