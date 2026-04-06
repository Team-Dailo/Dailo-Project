import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getFestivalParticipation,
  formatElapsed,
  hasParticipationCompletedToday,
  markParticipationCompletedToday,
  type FestivalParticipation,
} from '../services/festivalParticipationStorage';

/** 30분 이상 체류 시 "축제 참여 완료"로 표시, 0~30분은 "축제 참여중" */
const PARTICIPATION_COMPLETE_SECONDS = 30 * 60;

/** 진입 시점 타이머 + 행사명. 칩/사이드메뉴/마이페이지에서 사용 */
export function useFestivalParticipation() {
  const [entry, setEntry] = useState<FestivalParticipation | null>(null);
  const [elapsedFormatted, setElapsedFormatted] = useState('00:00:00');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const markedCompleteForSessionRef = useRef(false);

  const refresh = useCallback(async () => {
    const value = await getFestivalParticipation();
    if (!value) {
      setEntry(null);
      return;
    }
    const completedToday = await hasParticipationCompletedToday(value.eventId);
    setEntry({ ...value, participationCompletedToday: completedToday });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    markedCompleteForSessionRef.current = false;
  }, [entry?.eventId, entry?.enteredAt]);

  useEffect(() => {
    if (!entry) {
      setElapsedFormatted('00:00:00');
      setElapsedSeconds(0);
      return;
    }
    const update = () => {
      if (entry.participationCompletedToday) {
        setElapsedSeconds(PARTICIPATION_COMPLETE_SECONDS);
        setElapsedFormatted(formatElapsed(PARTICIPATION_COMPLETE_SECONDS));
        return;
      }
      const sessionSec = Math.floor((Date.now() - entry.enteredAt) / 1000);
      if (sessionSec >= PARTICIPATION_COMPLETE_SECONDS) {
        if (!markedCompleteForSessionRef.current) {
          markedCompleteForSessionRef.current = true;
          void markParticipationCompletedToday(entry.eventId).then(() => {
            setEntry((prev) =>
              prev && String(prev.eventId) === String(entry.eventId)
                ? { ...prev, participationCompletedToday: true }
                : prev
            );
          });
        }
        setElapsedSeconds(PARTICIPATION_COMPLETE_SECONDS);
        setElapsedFormatted(formatElapsed(PARTICIPATION_COMPLETE_SECONDS));
        return;
      }
      setElapsedSeconds(sessionSec);
      setElapsedFormatted(formatElapsed(sessionSec));
    };
    update();
    const interval = setInterval(update, 1000);
    const recheckStorage = setInterval(refresh, 2000);
    return () => {
      clearInterval(interval);
      clearInterval(recheckStorage);
    };
  }, [entry, refresh]);

  const isCompleted =
    !!entry?.participationCompletedToday || elapsedSeconds >= PARTICIPATION_COMPLETE_SECONDS;

  return { entry, elapsedFormatted, elapsedSeconds, isCompleted, refresh };
}
