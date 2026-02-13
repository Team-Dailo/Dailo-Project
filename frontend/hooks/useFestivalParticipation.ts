import { useState, useEffect, useCallback } from 'react';
import {
  getFestivalParticipation,
  formatElapsed,
  type FestivalParticipation,
} from '../services/festivalParticipationStorage';

/** 30분 이상 체류 시 "참여 완료"로 표시 */
const PARTICIPATION_COMPLETE_SECONDS = 30 * 60;

/** 진입 시점 타이머 + 행사명. 칩/사이드메뉴/마이페이지에서 사용 */
export function useFestivalParticipation() {
  const [entry, setEntry] = useState<FestivalParticipation | null>(null);
  const [elapsedFormatted, setElapsedFormatted] = useState('00:00:00');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const refresh = useCallback(async () => {
    const value = await getFestivalParticipation();
    setEntry(value);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!entry) {
      setElapsedFormatted('00:00:00');
      setElapsedSeconds(0);
      return;
    }
    const update = () => {
      const sec = Math.floor((Date.now() - entry.enteredAt) / 1000);
      setElapsedSeconds(sec);
      setElapsedFormatted(formatElapsed(sec));
    };
    update();
    const interval = setInterval(update, 1000);
    const recheckStorage = setInterval(refresh, 2000);
    return () => {
      clearInterval(interval);
      clearInterval(recheckStorage);
    };
  }, [entry, refresh]);

  const isCompleted = elapsedSeconds >= PARTICIPATION_COMPLETE_SECONDS;

  return { entry, elapsedFormatted, elapsedSeconds, isCompleted, refresh };
}
