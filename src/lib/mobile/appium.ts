import { createLogger } from '@/lib/utils/logger';
import MobileContext from './context';
import { Platform, PlatformConfig } from './types';
import { platformConfigManager } from './platformConfig';

const logger = createLogger('Appium');

export default class Appium {
  private platformConfig: PlatformConfig;

  constructor(platformConfig?: PlatformConfig) {
    logger.info('Appium constructor');
    this.platformConfig = platformConfig || platformConfigManager.getCurrentConfig();
  }

  async init() {
    logger.info(`Appium init for platform: ${this.platformConfig.platform}`);

    // Log platform-specific setup instructions
    if (this.platformConfig.platform === Platform.ANDROID) {
      console.log('Android setup:');
      console.log('1. Start Appium server: npm run appium');
      console.log('2. Ensure Android emulator/device is connected');
      console.log('3. Install UiAutomator2 driver: npm run setup:appium');
    } else {
      console.log('iOS setup:');
      console.log('1. Start Appium server: npm run appium');
      console.log('2. Ensure iOS simulator/device is connected');
      console.log('3. Install XCUITest driver: appium driver install xcuitest');
      console.log('4. For real devices, ensure proper provisioning profiles');
    }
  }

  async newContext(customConfig?: PlatformConfig): Promise<MobileContext> {
    const config = customConfig || this.platformConfig;
    logger.info(`Creating new mobileContext for ${config.platform}`);

    const mobileContext = new MobileContext(config);
    await mobileContext.init();
    return mobileContext;
  }

  async newAndroidContext(deviceName?: string, appPackage?: string, appActivity?: string): Promise<MobileContext> {
    logger.info('Creating new Android context');

    const androidConfig: PlatformConfig = {
      platform: Platform.ANDROID,
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': deviceName || 'Android Emulator',
        'appium:appPackage': appPackage,
        'appium:appActivity': appActivity,
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
      host: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
    };

    return this.newContext(androidConfig);
  }

  async newIOSContext(
    deviceName?: string,
    bundleId?: string,
    platformVersion?: string,
    udid?: string
  ): Promise<MobileContext> {
    logger.info('Creating new iOS context');

    const iosConfig: PlatformConfig = {
      platform: Platform.IOS,
      capabilities: {
        platformName: 'iOS',
        'appium:automationName': 'XCUITest',
        'appium:deviceName': deviceName || 'iPhone Simulator',
        'appium:platformVersion': platformVersion || '17.0',
        'appium:bundleId': bundleId,
        'appium:udid': udid,
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
      host: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
    };

    return this.newContext(iosConfig);
  }

  setPlatformConfig(config: PlatformConfig): void {
    this.platformConfig = config;
    platformConfigManager.setConfig(config);
  }

  getPlatform(): Platform {
    return this.platformConfig.platform;
  }
}
