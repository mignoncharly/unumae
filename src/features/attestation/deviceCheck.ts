import { requireOptionalNativeModule } from 'expo-modules-core';

interface DeviceCheckModule {
  isSupported: boolean;
  generateTokenAsync(): Promise<string>;
}

export function loadDeviceCheckModule(): DeviceCheckModule | null {
  return requireOptionalNativeModule<DeviceCheckModule>('ExpoDeviceCheck');
}
