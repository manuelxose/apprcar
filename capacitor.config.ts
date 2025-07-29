
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parkingapp.mobile',
  appName: 'ParkingApp',
  webDir: 'dist/parking-app',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'parkingapp.com'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#2196F3',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#2196F3'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    Geolocation: {
      permissions: {
        location: 'always'
      }
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#2196F3',
      sound: 'beep.wav'
    },
    Camera: {
      permissions: {
        camera: 'limited'
      }
    },
    Haptics: {},
    App: {
      launchUrl: 'https://parkingapp.com'
    },
    Browser: {
      toolbarColor: '#2196F3'
    },
    Device: {},
    Network: {},
    Storage: {},
    Share: {},
    Toast: {}
  },
  android: {
    buildOptions: {
      keystorePath: 'android/app/parkingapp-release-key.keystore',
      keystoreAlias: 'parkingapp',
      releaseType: 'APK',
      signingType: 'apksigner'
    },
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    scheme: 'ParkingApp',
    contentInset: 'automatic',
    scrollEnabled: true,
    allowsLinkPreview: true
  }
};

export default config;