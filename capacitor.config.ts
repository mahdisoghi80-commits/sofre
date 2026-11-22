import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ir.sofreh.mealplanner',
  appName: 'سفره',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#FBF5EF',
  },
  ios: {
    backgroundColor: '#FBF5EF',
    contentInset: 'automatic',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#FBF5EF',
      showSpinner: false,
    },
  },
};

export default config;
