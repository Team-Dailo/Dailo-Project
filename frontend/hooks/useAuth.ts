// hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import * as authService from '../services/auth.service';

export { useAuthContext, useAuthContext as useAuth } from '../contexts/AuthContext';
export type { AuthUser } from '../contexts/AuthContext';

/** 로그인한 회원 id (게시판 내 글/수정 판별, 내 글 목록용). 없으면 저장값 → getMe() → 게시판과 동일한 effective id(1) fallback */
export function useMyUserId(): number | null {
  const { user } = useAuthContext();
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  useEffect(() => {
    if (user == null) {
      setResolvedId(null);
      return;
    }
    if (user.id != null && user.id > 0) {
      setResolvedId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const id = await authService.getStoredUserId();
      if (id != null && id > 0 && !cancelled) {
        setResolvedId(id);
        return;
      }
      const me = await authService.getMe();
      if (cancelled) return;
      const meId = me?.id != null && me.id > 0 ? me.id : null;
      if (meId != null) {
        await authService.setStoredUserId(meId);
        setResolvedId(meId);
        return;
      }
      // 로그인됐는데 id를 못 가져오면 1로 추측하지 않음 → null (다른 계정 인식 위해)
      if (!cancelled) setResolvedId(null);
    })();
    return () => { cancelled = true; };
  }, [user?.id, user != null]);

  const id = user?.id;
  if (id != null && id > 0) return id;
  return resolvedId;
}
