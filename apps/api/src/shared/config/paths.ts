/**
 * Resolving the paths of the runtime data.
 *
 * The API is started from `apps/api`, but the data belongs to the whole
 * project: the sessions, the employee directory and the access log
 * should live in one place — the `.data/` directory at the root of the
 * repository — no matter where the process was started from.
 */

import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The root of the repository.
 *
 * The file lives in `apps/api/src/shared/config/`, so the root is five
 * levels up: config → shared → src → api → apps → the repository.
 */
export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');

/**
 * Resolves a path of the runtime data against the root of the project.
 *
 * An absolute path is left as it is.
 */
export function resolveDataPath(path: string): string {
  if (!path) return path;
  if (isAbsolute(path)) return path;
  return resolve(projectRoot, path);
}
