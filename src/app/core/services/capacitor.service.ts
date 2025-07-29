
import { Injectable, inject, signal } from '@angular/core';
import { Platform } from '@angular/cdk/platform';
import { Observable, from, of, BehaviorSubject } from 'rxjs';
import { catchError, map } from 'rxjs';

// Capacitor imports
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Geolocation, Position } from '@capacitor/geolocation';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Share, ShareOptions } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Device, DeviceInfo } from '@capacitor/device';
import { Network, ConnectionStatus } from '@capacitor/network';
import { App, AppState } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Toast } from '@capacitor/toast';

@Injectable({
  providedIn: 'root'
})
export class CapacitorService {
  private platform = inject(Platform);

  // State signals
  isNative = signal(Capacitor.isNativePlatform());
  deviceInfo = signal<DeviceInfo | null>(null);
  networkStatus = signal<ConnectionStatus | null>(null);
  appState = signal<AppState | null>(null);

  // Push notifications
  private pushTokenSubject = new BehaviorSubject<string | null>(null);
  pushToken$ = this.pushTokenSubject.asObservable();

  constructor() {
    this.initializeCapacitor();
  }

  private async initializeCapacitor(): Promise<void> {
    if (!this.isNative()) return;

    try {
      // Initialize device info
      const deviceInfo = await Device.getInfo();
      this.deviceInfo.set(deviceInfo);

      // Initialize network status
      const networkStatus = await Network.getStatus();
      this.networkStatus.set(networkStatus);

      // Setup listeners
      this.setupNetworkListener();
      this.setupAppStateListener();
      this.setupPushNotifications();

      // Hide splash screen
      await this.hideSplashScreen();

      // Configure status bar
      await this.configureStatusBar();

    } catch (error) {
      console.error('Error initializing Capacitor:', error);
    }
  }

  // ===================
  // SPLASH SCREEN
  // ===================

  async hideSplashScreen(): Promise<void> {
    if (!this.isNative()) return;
    
    try {
      await SplashScreen.hide();
    } catch (error) {
      console.error('Error hiding splash screen:', error);
    }
  }

  // ===================
  // STATUS BAR
  // ===================

  async configureStatusBar(style: Style = Style.Default): Promise<void> {
    if (!this.isNative()) return;

    try {
      await StatusBar.setStyle({ style });
      
      if (this.platform.ANDROID) {
        await StatusBar.setBackgroundColor({ color: '#2196F3' });
      }
    } catch (error) {
      console.error('Error configuring status bar:', error);
    }
  }

  async setStatusBarStyle(style: Style): Promise<void> {
    await this.configureStatusBar(style);
  }

  // ===================
  // GEOLOCATION
  // ===================

  getCurrentPosition(): Observable<Position> {
    if (!this.isNative()) {
      // Fallback to web geolocation
      return new Observable(observer => {
        navigator.geolocation.getCurrentPosition(
          position => observer.next({
            timestamp: position.timestamp,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            }
          }),
          error => observer.error(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });
    }

    return from(Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000
    })).pipe(
      catchError(error => {
        console.error('Geolocation error:', error);
        throw error;
      })
    );
  }

  watchPosition(): Observable<Position> {
    if (!this.isNative()) {
      // Fallback to web geolocation
      return new Observable(observer => {
        const watchId = navigator.geolocation.watchPosition(
          position => observer.next({
            timestamp: position.timestamp,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              altitude: position.coords.altitude,
              accuracy: position.coords.accuracy,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed
            }
          }),
          error => observer.error(error),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
      });
    }

    return new Observable(observer => {
      let watchId: string;
      
      Geolocation.watchPosition({
        enableHighAccuracy: true,
        timeout: 10000
      }, (position, err) => {
        if (err) {
          observer.error(err);
        } else if (position) {
          observer.next(position);
        }
      }).then(id => {
        watchId = id;
      }).catch(error => {
        observer.error(error);
      });

      return () => {
        if (watchId) {
          Geolocation.clearWatch({ id: watchId });
        }
      };
    });
  }

  // ===================
  // PUSH NOTIFICATIONS
  // ===================

  private async setupPushNotifications(): Promise<void> {
    if (!this.isNative() || !this.isPluginAvailable('PushNotifications')) return;
    
    try {
      // Request permissions
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        await PushNotifications.register();
      }

      // Listen for registration
      PushNotifications.addListener('registration', (token: Token) => {
        this.pushTokenSubject.next(token.value);
        console.log('Push registration success, token: ' + token.value);
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Listen for push notifications
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));
        this.handlePushNotification(notification);
      });

      // Listen for push notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
        this.handlePushAction(notification);
      });

    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  }

  private handlePushNotification(notification: PushNotificationSchema): void {
    // Handle received push notification
    if (notification.title && notification.body) {
      this.showToast(`${notification.title}: ${notification.body}`);
    }
  }

  private handlePushAction(action: ActionPerformed): void {
    // Handle push notification action
    const data = action.notification.data;
    
    if (data.route) {
      // Navigate to specific route
      window.location.href = data.route;
    }
  }

  // ===================
  // LOCAL NOTIFICATIONS
  // ===================

  async scheduleLocalNotification(notification: Partial<LocalNotificationSchema>): Promise<void> {
    if (!this.isNative() || !this.isPluginAvailable('LocalNotifications')) return;

    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: notification.id || Date.now(),
          title: notification.title || 'ParkingApp',
          body: notification.body || '',
          schedule: notification.schedule,
          sound: 'beep.wav',
          smallIcon: 'ic_stat_icon_config_sample',
          iconColor: '#2196F3',
          ...notification
        }]
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }

  async cancelLocalNotification(id: number): Promise<void> {
    if (!this.isNative() || !this.isPluginAvailable('LocalNotifications')) return;

    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
    } catch (error) {
      console.error('Error canceling local notification:', error);
    }
  }

  // ===================
  // HAPTICS
  // ===================

  async hapticImpact(style: ImpactStyle = ImpactStyle.Medium): Promise<void> {
    if (!this.isNative()) return;

    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Error with haptic impact:', error);
    }
  }

  async hapticNotification(type: NotificationType = NotificationType.Success): Promise<void> {
    if (!this.isNative()) return;

    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.error('Error with haptic notification:', error);
    }
  }

  async hapticVibrate(duration: number = 300): Promise<void> {
    if (!this.isNative()) return;

    try {
      await Haptics.vibrate({ duration });
    } catch (error) {
      console.error('Error with haptic vibrate:', error);
    }
  }

  // ===================
  // SHARING
  // ===================

  async share(options: ShareOptions): Promise<void> {
    try {
      if (this.isNative()) {
        await Share.share(options);
      } else {
        // Fallback to Web Share API
        if (navigator.share) {
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url
          });
        } else {
          // Copy to clipboard fallback
          if (options.url) {
            await navigator.clipboard.writeText(options.url);
          }
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  }

  // ===================
  // CAMERA
  // ===================

  async takePicture(): Promise<string | null> {
    if (!this.isNative() || !this.isPluginAvailable('Camera')) return null;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('Error taking picture:', error);
      return null;
    }
  }

  async pickFromGallery(): Promise<string | null> {
    if (!this.isNative() || !this.isPluginAvailable('Camera')) return null;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos
      });

      return image.dataUrl || null;
    } catch (error) {
      console.error('Error picking from gallery:', error);
      return null;
    }
  }

  // ===================
  // NETWORK
  // ===================

  private setupNetworkListener(): void {
    if (!this.isNative()) return;

    Network.addListener('networkStatusChange', (status: any) => {
      this.networkStatus.set(status);
      console.log('Network status changed', status);
    });
  }

  isOnline(): boolean {
    const status = this.networkStatus();
    return status ? status.connected : navigator.onLine;
  }

  getNetworkType(): string {
    const status = this.networkStatus();
    return status ? status.connectionType : 'unknown';
  }

  // ===================
  // APP STATE
  // ===================

  private setupAppStateListener(): void {
    if (!this.isNative()) return;

    App.addListener('appStateChange', (state: any) => {
      this.appState.set(state);
      console.log('App state changed', state);
    });

    App.addListener('backButton', () => {
      // Handle back button
      const currentUrl = window.location.pathname;
      
      if (currentUrl === '/' || currentUrl === '/home') {
        App.exitApp();
      } else {
        window.history.back();
      }
    });
  }

  async exitApp(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await App.exitApp();
    } catch (error) {
      console.error('Error exiting app:', error);
    }
  }

  // ===================
  // BROWSER
  // ===================

  async openUrl(url: string): Promise<void> {
    try {
      if (this.isNative()) {
        await Browser.open({ 
          url,
          toolbarColor: '#2196F3',
          presentationStyle: 'popover'
        });
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  }

  // ===================
  // TOAST
  // ===================

  async showToast(text: string, duration: 'short' | 'long' = 'short'): Promise<void> {
    try {
      if (this.isNative()) {
        await Toast.show({
          text,
          duration: duration,
          position: 'bottom'
        });
      } else {
        // Fallback to browser notification or custom toast
        console.log('Toast:', text);
      }
    } catch (error) {
      console.error('Error showing toast:', error);
    }
  }

  // ===================
  // DEVICE INFO
  // ===================

  getDeviceInfo(): DeviceInfo | null {
    return this.deviceInfo();
  }

  getPlatform(): string {
    const info = this.deviceInfo();
    return info ? info.platform : 'web';
  }

  isIOS(): boolean {
    return this.getPlatform() === 'ios';
  }

  isAndroid(): boolean {
    return this.getPlatform() === 'android';
  }

  // ===================
  // UTILITIES
  // ===================

  isCapacitorAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Device');
  }

  isPluginAvailable(pluginName: string): boolean {
    return Capacitor.isPluginAvailable(pluginName);
  }

  async checkPermissions(permission: string): Promise<boolean> {
    try {
      // This would need specific implementation per permission type
      return true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }
}
