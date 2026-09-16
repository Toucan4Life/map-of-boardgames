import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default withVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.strictTypeChecked,
  skipFormatting,

  {
    name: 'app/attribute-hyphenation-required-props',
    rules: {
      // Static (non-`:`-bound) attributes for *required* props aren't correctly matched back
      // to their camelCase prop by this project's vue-tsc setup when written in kebab-case,
      // causing false "missing required prop" type errors. Keep camelCase for those specific
      // required props; everything else still follows the default kebab-case convention.
      'vue/attribute-hyphenation': ['error', 'always', { ignore: ['ariaLabel'] }],
    },
  },
)
