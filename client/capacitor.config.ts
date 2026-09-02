import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hamdydraw.lockly',
  appName: 'Lockly',
  webDir: 'dist',
  android: {
    // The WebView is served over https://localhost (a secure context, which the
    // clipboard API requires), but a self-hosted server on the LAN is usually
    // plain http — without this the WebView blocks those calls as mixed content.
    allowMixedContent: true,
  },
  backgroundColor: '#0B0D17',
};

export default config;
