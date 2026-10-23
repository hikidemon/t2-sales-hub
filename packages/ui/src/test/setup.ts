import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// `globals: false` in the Vitest config disables the automatic cleanup
// that Testing Library registers via a global `afterEach`.
afterEach(() => {
  cleanup();
});
