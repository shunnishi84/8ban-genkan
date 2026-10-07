import type { CapacitorConfig } from '@capacitor/cli';

// Android アプリ化の設定。Web 版（dist/）をそのままアプリに同梱する
const config: CapacitorConfig = {
  appId: 'com.shunnishi.hachibangenkan',
  appName: '8番玄関',
  webDir: 'dist',
  android: {
    // ゲームの背景色と揃えて、起動直後の白フラッシュを防ぐ
    backgroundColor: '#0b0d12',
  },
};

export default config;
