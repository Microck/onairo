import type { ManifestV3Export } from '@crxjs/vite-plugin'

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'Onairo',
  version: '0.1.0',
  description:
    'Browser-native AI relay for quiet one-shot text, image, and capture workflows.',
  action: {
    default_title: 'Onairo',
    default_popup: 'src/popup/index.html',
  },
  options_page: 'src/options/index.html',
  permissions: [
    'activeTab',
    'clipboardRead',
    'clipboardWrite',
    'contextMenus',
    'nativeMessaging',
    'notifications',
    'permissions',
    'scripting',
    'storage',
  ],
  host_permissions: [
    'https://api.moonshot.ai/*',
    'https://openrouter.ai/*',
    'https://api.z.ai/*',
  ],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_end',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-128.png', 'logo-mark.png'],
      matches: ['http://*/*', 'https://*/*'],
    },
  ],
  icons: {
    '16': 'icon-16.png',
    '32': 'icon-32.png',
    '48': 'icon-48.png',
    '128': 'icon-128.png',
  },
}

export default manifest
