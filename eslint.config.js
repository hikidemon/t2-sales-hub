/**
 * Root ESLint flat config.
 * Re-exports the shared config from packages/config and adds
 * monorepo-wide overrides (FSD boundaries, Node/ browser globals).
 *
 * Note: automatic FSD boundary linting checks import specifiers only
 * (alias-based). Relative cross-layer imports are guarded by convention
 * and code review — see ARCHITECTURE.md «Ограничения».
 */
import shared from './packages/config/eslint/index.js';

export default [
  ...shared,
  {
    // shared (FSD) must not depend on upper layers of the same app
    files: ['apps/web/src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/app/**',
                '**/pages/**',
                '**/widgets/**',
                '**/features/**',
                '**/entities/**',
              ],
              message:
                'FSD violation: shared layer cannot import app, pages, widgets, features or entities.',
            },
          ],
        },
      ],
    },
  },
  {
    // entities must not depend on features/widgets/pages/app
    files: ['apps/web/src/entities/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/app/**', '**/pages/**', '**/widgets/**', '**/features/**'],
              message: 'FSD violation: entities cannot import app, pages, widgets or features.',
            },
          ],
        },
      ],
    },
  },
];
