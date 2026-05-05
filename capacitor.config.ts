import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.changqingge.mahjong',
  appName: '长清阁麻将',
  webDir: '.output/public',
  server: {
    url: 'https://cv388xr9771.vicp.fun/mahjong/',
    cleartext: false,
  },
};

export default config;
