import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.changqingge.mahjong',
  appName: '长清阁麻将',
  webDir: '.output/public',
  server: {
    url: 'http://116.233.75.251:8888/mahjong/',
    cleartext: true,
  },
};

export default config;
