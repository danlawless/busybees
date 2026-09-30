import { levelForPath, type Level } from './nav';

/** True when the path is owner-level and the session is not. Missing pathname fails closed. */
export function needsUpgrade(pathname: string | null, level: Level): boolean {
  const required: Level = pathname ? levelForPath(pathname) : 'admin';
  return required === 'admin' && level !== 'admin';
}
