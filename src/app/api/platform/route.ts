import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { Platform, PlatformConfig } from '@/lib/mobile/types';
import { platformConfigManager, createAndroidConfig, createIOSConfig } from '@/lib/mobile/platformConfig';

const logger = createLogger('API:Platform');

/**
 * GET /api/platform
 * Get current platform configuration
 */
export async function GET() {
  try {
    logger.info('Getting current platform configuration');
    const config = platformConfigManager.getCurrentConfig();
    
    return NextResponse.json({
      success: true,
      platform: config.platform,
      config: config,
    });
  } catch (error) {
    logger.error('Error getting platform configuration:', error);
    return NextResponse.json(
      { error: 'Failed to get platform configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform
 * Set platform configuration
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Setting platform configuration');
    const data = await request.json();
    const { platform, deviceName, ...additionalConfig } = data;

    if (!platform || !Object.values(Platform).includes(platform)) {
      return NextResponse.json(
        { error: 'Valid platform (Android or iOS) is required' },
        { status: 400 }
      );
    }

    let config: PlatformConfig;

    if (platform === Platform.ANDROID) {
      config = createAndroidConfig(
        deviceName || 'Android Emulator',
        additionalConfig.appPackage,
        additionalConfig.appActivity
      );
    } else {
      config = createIOSConfig(
        deviceName || 'iPhone Simulator',
        additionalConfig.bundleId,
        additionalConfig.platformVersion || '17.0'
      );
    }

    // Add any additional capabilities
    if (additionalConfig.capabilities) {
      Object.assign(config.capabilities, additionalConfig.capabilities);
    }

    // Validate configuration
    if (!platformConfigManager.validateConfig(config)) {
      return NextResponse.json(
        { error: 'Invalid platform configuration' },
        { status: 400 }
      );
    }

    platformConfigManager.setConfig(config);

    return NextResponse.json({
      success: true,
      message: `Platform set to ${platform}`,
      config: config,
    });
  } catch (error) {
    logger.error('Error setting platform configuration:', error);
    return NextResponse.json(
      { error: 'Failed to set platform configuration' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/platform/auto
 * Auto-configure platform from environment
 */
export async function PUT() {
  try {
    logger.info('Auto-configuring platform from environment');
    platformConfigManager.autoConfigureFromEnvironment();
    const config = platformConfigManager.getCurrentConfig();

    return NextResponse.json({
      success: true,
      message: `Platform auto-configured to ${config.platform}`,
      config: config,
    });
  } catch (error) {
    logger.error('Error auto-configuring platform:', error);
    return NextResponse.json(
      { error: 'Failed to auto-configure platform' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/platform/supported
 * Get list of supported platforms and their default configurations
 */
export async function OPTIONS() {
  try {
    const supportedPlatforms = {
      [Platform.ANDROID]: {
        name: 'Android',
        automationName: 'UiAutomator2',
        defaultDevice: 'Android Emulator',
        requiredCapabilities: ['appium:deviceName'],
        optionalCapabilities: ['appium:appPackage', 'appium:appActivity', 'appium:udid'],
      },
      [Platform.IOS]: {
        name: 'iOS',
        automationName: 'XCUITest',
        defaultDevice: 'iPhone Simulator',
        requiredCapabilities: ['appium:deviceName'],
        optionalCapabilities: ['appium:bundleId', 'appium:platformVersion', 'appium:udid'],
      },
    };

    return NextResponse.json({
      success: true,
      supportedPlatforms,
      currentPlatform: platformConfigManager.getCurrentConfig().platform,
    });
  } catch (error) {
    logger.error('Error getting supported platforms:', error);
    return NextResponse.json(
      { error: 'Failed to get supported platforms' },
      { status: 500 }
    );
  }
}
