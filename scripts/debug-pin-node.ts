/**
 * Проверка входа по ПИН теми же модулями, что работают в API.
 *
 * Запуск: cd apps/api && ./node_modules/.bin/tsx ../../scripts/debug-pin-node.ts
 */

import { EmployeeDirectory } from '../apps/api/src/modules/auth/directory.js';
import { hashPin, verifyPin } from '../apps/api/src/modules/auth/pin.js';
import { resolveDataPath } from '../apps/api/src/shared/config/paths.js';

const directory = new EmployeeDirectory({
  filePath: resolveDataPath('.data/employees.json'),
});
await directory.load();

console.log('записей:', directory.size);
console.log('projectRoot:', resolveDataPath('.'));

const employee = directory.findByName('ИСАКОВА');
console.log('найден:', employee?.id, employee?.name, 'активен:', employee?.active);
console.log('хеш в файле:', employee?.pinHash?.slice(0, 40));

if (employee) {
  console.log('verifyPin 1234:', verifyPin('1234', employee.pinHash));
  console.log('verifyPin 0000:', verifyPin('0000', employee.pinHash));
}

// Сверяем со Scrypt, посчитанным здесь же.
const { scryptSync } = await import('node:crypto');
const parts = (employee?.pinHash ?? '').split('$');
if (parts.length === 3) {
  const salt = Buffer.from(parts[1] as string, 'base64');
  const expected = Buffer.from(parts[2] as string, 'base64');
  const derived = scryptSync('1234', salt, 32);
  console.log('ручная сверка:', derived.equals(expected));
}

// Новый хеш здесь — должен совпасть с проверкой.
const fresh = hashPin('1234');
console.log('свежий хеш проверяется:', verifyPin('1234', fresh));
