import { levelForPath, roleToLevel, type Level } from './nav';
import { apiLevelForPath } from './api-access';
import { MAX_SESSION_MS } from './session-stamp';

type PageDecision = { kind: 'allow' } | { kind: 'login'; to: string } | { kind: 'upgrade' };
type ApiDecision = { kind: 'allow' } | { kind: 'deny'; status: 401 | 403 };

const live = (startedAt: number | null, now: number) => startedAt !== null && now - startedAt < MAX_SESSION_MS && startedAt <= now;

export function decidePageAccess(i: { pathname: string; role: string | null; startedAt: number | null; now: number }): PageDecision {
  if (i.pathname === '/admin/login' || i.pathname.startsWith('/admin/login/')) return { kind: 'allow' };
  const level = roleToLevel(i.role);
  const isEditor = i.pathname === '/editor' || i.pathname.startsWith('/editor/');
  const to = isEditor ? '/admin/settings' : i.pathname;
  if (!level || !live(i.startedAt, i.now)) return { kind: 'login', to };
  if (levelForPath(i.pathname) === 'admin' && level !== 'admin') {
    return isEditor ? { kind: 'login', to } : { kind: 'upgrade' };
  }
  return { kind: 'allow' };
}

export function decideApiAccess(i: { pathname: string; method?: string; role: string | null; signedIn: boolean; startedAt: number | null; now: number }): ApiDecision {
  const need = apiLevelForPath(i.pathname, i.method);
  if (need === null || need === 'self') return { kind: 'allow' };
  if (need === 'signed-in') return i.signedIn ? { kind: 'allow' } : { kind: 'deny', status: 401 };
  if (!i.signedIn) return { kind: 'deny', status: 401 };
  const level = roleToLevel(i.role);
  if (!level) return { kind: 'deny', status: 403 };
  if (!live(i.startedAt, i.now)) return { kind: 'deny', status: 401 };
  if (need === 'admin' && level !== 'admin') return { kind: 'deny', status: 403 };
  return { kind: 'allow' };
}

/** GET /api/admin/session: the level when the role is staff/admin and the stamp is live, else null. */
export function liveAdminLevel(i: { role: string | null; startedAt: number | null; now: number }): Level | null {
  const level = roleToLevel(i.role);
  return level && live(i.startedAt, i.now) ? level : null;
}
