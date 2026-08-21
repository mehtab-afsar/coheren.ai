import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    // Design-system guardrail: feature code should compose Tier 0 primitives
    // (src/shared/components/ui) and design tokens instead of hand-rolling
    // raw hex colors or bare <button>s. `warn` (not `error`) so this surfaces
    // in `npm run lint` output without failing CI mid-migration — see
    // docs/DESIGN_SYSTEM.md for the phased plan to burn this down to zero and
    // flip it to `error`.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['warn',
        {
          selector: 'Literal[value=/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
          message: 'Raw hex color — use a design token (tokens.colors.*, --c-* var, or ap.*) instead. See docs/DESIGN_SYSTEM.md.',
        },
        {
          selector: 'JSXOpeningElement[name.name="button"]',
          message: 'Raw <button> — this file should compose a shared Tier 0 primitive instead of hand-rolling button styling. See docs/DESIGN_SYSTEM.md for the primitives migration plan.',
        },
      ],
    },
  },
])
