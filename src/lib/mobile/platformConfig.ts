import { Platform, PlatformConfig, AndroidCapabilities, IOSCapabilities } from './types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PlatformConfig');

export class PlatformConfigManager {
  private static instance: PlatformConfigManager;
  private currentConfig: PlatformConfig;

  private constructor() {
    // Default to Android
    this.currentConfig = this.getDefaultAndroidConfig();
  }

  public static getInstance(): PlatformConfigManager {
    if (!PlatformConfigManager.instance) {
      PlatformConfigManager.instance = new PlatformConfigManager();
    }
    return PlatformConfigManager.instance;
  }

  public getCurrentConfig(): PlatformConfig {
    return this.currentConfig;
  }

  public setConfig(config: PlatformConfig): void {
    this.currentConfig = config;
    logger.info(`Platform configuration set to: ${config.platform}`);
  }

  public switchToAndroid(deviceName?: string): void {
    const config = this.getDefaultAndroidConfig();
    if (deviceName) {
      (config.capabilities as AndroidCapabilities)['appium:deviceName'] = deviceName;
    }
    this.setConfig(config);
  }

  public switchToIOS(deviceName?: string, platformVersion?: string): void {
    const config = this.getDefaultIOSConfig();
    if (deviceName) {
      (config.capabilities as IOSCapabilities)['appium:deviceName'] = deviceName;
    }
    if (platformVersion) {
      (config.capabilities as IOSCapabilities)['appium:platformVersion'] = platformVersion;
    }
    this.setConfig(config);
  }

  public detectPlatformFromEnvironment(): Platform {
    // Check environment variables or other indicators
    const platformEnv = process.env.MOBILE_PLATFORM?.toUpperCase();
    
    if (platformEnv === 'IOS') {
      return Platform.IOS;
    } else if (platformEnv === 'ANDROID') {
      return Platform.ANDROID;
    }

    // Default to Android if not specified
    logger.info('No platform specified in environment, defaulting to Android');
    return Platform.ANDROID;
  }

  public autoConfigureFromEnvironment(): void {
    const platform = this.detectPlatformFromEnvironment();
    
    if (platform === Platform.IOS) {
      this.switchToIOS(
        process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
        process.env.IOS_PLATFORM_VERSION || '17.0'
      );
    } else {
      this.switchToAndroid(
        process.env.ANDROID_DEVICE_NAME || 'Android Emulator'
      );
    }
  }

  private getDefaultAndroidConfig(): PlatformConfig {
    return {
      platform: Platform.ANDROID,
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': process.env.ANDROID_DEVICE_NAME || 'Android Emulator',
        'appium:appPackage': process.env.ANDROID_APP_PACKAGE,
        'appium:appActivity': process.env.ANDROID_APP_ACTIVITY,
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
      host: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
    };
  }

  private getDefaultIOSConfig(): PlatformConfig {
    return {
      platform: Platform.IOS,
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
        'appium:platformVersion': process.env.IOS_PLATFORM_VERSION || '17.0',
        'appium:bundleId': process.env.IOS_BUNDLE_ID,
        'appium:udid': process.env.IOS_UDID,
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
      host: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
    };
  }

  public createCustomConfig(
    platform: Platform,
    deviceName: string,
    additionalCapabilities?: Record<string, any>
  ): PlatformConfig {
    const baseConfig = platform === Platform.IOS 
      ? this.getDefaultIOSConfig() 
      : this.getDefaultAndroidConfig();

    // Update device name
    if (platform === Platform.IOS) {
      (baseConfig.capabilities as IOSCapabilities)['appium:deviceName'] = deviceName;
    } else {
      (baseConfig.capabilities as AndroidCapabilities)['appium:deviceName'] = deviceName;
    }

    // Add additional capabilities
    if (additionalCapabilities) {
      Object.assign(baseConfig.capabilities, additionalCapabilities);
    }

    return baseConfig;
  }

  public validateConfig(config: PlatformConfig): boolean {
    try {
      // Basic validation
      if (!config.platform || !config.capabilities) {
        logger.error('Invalid config: missing platform or capabilities');
        return false;
      }

      // Platform-specific validation
      if (config.platform === Platform.ANDROID) {
        const caps = config.capabilities as AndroidCapabilities;
        if (caps.platformName !== 'Android' || caps['appium:automationName'] !== 'UiAutomator2') {
          logger.error('Invalid Android configuration');
          return false;
        }
      } else if (config.platform === Platform.IOS) {
        const caps = config.capabilities as IOSCapabilities;
        if (caps.platformName !== 'iOS' || caps['appium:automationName'] !== 'XCUITest') {
          logger.error('Invalid iOS configuration');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error validating config:', error);
      return false;
    }
  }
}

// Export singleton instance
export const platformConfigManager = PlatformConfigManager.getInstance();

// Helper functions
export function createAndroidConfig(deviceName: string, appPackage?: string, appActivity?: string): PlatformConfig {
  return platformConfigManager.createCustomConfig(Platform.ANDROID, deviceName, {
    'appium:appPackage': appPackage,
    'appium:appActivity': appActivity,
  });
}

export function createIOSConfig(deviceName: string, bundleId?: string, platformVersion?: string): PlatformConfig {
  return platformConfigManager.createCustomConfig(Platform.IOS, deviceName, {
    'appium:bundleId': bundleId,
    'appium:platformVersion': platformVersion,
  });
}
