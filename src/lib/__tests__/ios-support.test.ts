import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Platform, PlatformConfig } from '../mobile/types';
import { platformConfigManager, createIOSConfig, createAndroidConfig } from '../mobile/platformConfig';
import { processPageSource as processIOSPageSource } from '../mobile/iosViewProcessor';
import { processPageSource as processAndroidPageSource } from '../mobile/androidViewProcessor';
import Appium from '../mobile/appium';
import MobileContext from '../mobile/context';

describe('iOS Support Tests', () => {
  describe('Platform Configuration', () => {
    it('should create valid iOS configuration', () => {
      const config = createIOSConfig('iPhone 15 Simulator', 'com.example.app', '17.0');
      
      expect(config.platform).toBe(Platform.IOS);
      expect(config.capabilities.platformName).toBe('iOS');
      expect(config.capabilities['appium:automationName']).toBe('XCUITest');
      expect(config.capabilities['appium:deviceName']).toBe('iPhone 15 Simulator');
      expect(config.capabilities['appium:bundleId']).toBe('com.example.app');
      expect(config.capabilities['appium:platformVersion']).toBe('17.0');
    });

    it('should create valid Android configuration', () => {
      const config = createAndroidConfig('Pixel 7 Emulator', 'com.example.app', '.MainActivity');
      
      expect(config.platform).toBe(Platform.ANDROID);
      expect(config.capabilities.platformName).toBe('Android');
      expect(config.capabilities['appium:automationName']).toBe('UiAutomator2');
      expect(config.capabilities['appium:deviceName']).toBe('Pixel 7 Emulator');
      expect(config.capabilities['appium:appPackage']).toBe('com.example.app');
      expect(config.capabilities['appium:appActivity']).toBe('.MainActivity');
    });

    it('should validate platform configurations', () => {
      const validIOSConfig = createIOSConfig('iPhone Simulator');
      const validAndroidConfig = createAndroidConfig('Android Emulator');
      
      expect(platformConfigManager.validateConfig(validIOSConfig)).toBe(true);
      expect(platformConfigManager.validateConfig(validAndroidConfig)).toBe(true);
      
      // Invalid config
      const invalidConfig = {
        platform: Platform.IOS,
        capabilities: {
          platformName: 'Android', // Wrong platform name for iOS
          'appium:automationName': 'XCUITest',
          'appium:deviceName': 'iPhone Simulator',
        },
      } as PlatformConfig;
      
      expect(platformConfigManager.validateConfig(invalidConfig)).toBe(false);
    });

    it('should switch between platforms', () => {
      platformConfigManager.switchToAndroid('Test Android Device');
      expect(platformConfigManager.getCurrentConfig().platform).toBe(Platform.ANDROID);
      
      platformConfigManager.switchToIOS('Test iOS Device', '16.0');
      expect(platformConfigManager.getCurrentConfig().platform).toBe(Platform.IOS);
      expect(platformConfigManager.getCurrentConfig().capabilities['appium:platformVersion']).toBe('16.0');
    });
  });

  describe('iOS View Processor', () => {
    it('should process iOS XML page source', async () => {
      const mockIOSXML = `<?xml version="1.0" encoding="UTF-8"?>
        <XCUIElementTypeApplication type="XCUIElementTypeApplication" name="TestApp" label="TestApp" enabled="true" visible="true" x="0" y="0" width="375" height="812">
          <XCUIElementTypeWindow type="XCUIElementTypeWindow" enabled="true" visible="true" x="0" y="0" width="375" height="812">
            <XCUIElementTypeButton type="XCUIElementTypeButton" name="Login" label="Login Button" enabled="true" visible="true" x="50" y="100" width="100" height="44"/>
            <XCUIElementTypeTextField type="XCUIElementTypeTextField" name="username" label="Username" enabled="true" visible="true" x="50" y="200" width="200" height="44"/>
            <XCUIElementTypeSecureTextField type="XCUIElementTypeSecureTextField" name="password" label="Password" enabled="true" visible="true" x="50" y="300" width="200" height="44"/>
          </XCUIElementTypeWindow>
        </XCUIElementTypeApplication>`;

      const result = await processIOSPageSource(mockIOSXML);
      
      expect(result.interactiveElements).toBeDefined();
      expect(result.interactiveElements.length).toBeGreaterThan(0);
      
      // Check if interactive elements are properly identified
      const buttonElement = result.interactiveElements.find(el => el.attributes['name'] === 'Login');
      expect(buttonElement).toBeDefined();
      expect(buttonElement?.isInteractive).toBe(true);
      expect(buttonElement?.bounds).toEqual({ x: 50, y: 100, width: 100, height: 44 });
    });

    it('should handle iOS element types correctly', async () => {
      const mockIOSXML = `<?xml version="1.0" encoding="UTF-8"?>
        <XCUIElementTypeApplication type="XCUIElementTypeApplication" name="TestApp" enabled="true" visible="true" x="0" y="0" width="375" height="812">
          <XCUIElementTypeSwitch type="XCUIElementTypeSwitch" name="Enable Notifications" enabled="true" visible="true" x="50" y="100" width="51" height="31"/>
          <XCUIElementTypeSlider type="XCUIElementTypeSlider" name="Volume" enabled="true" visible="true" x="50" y="200" width="200" height="44"/>
          <XCUIElementTypeSegmentedControl type="XCUIElementTypeSegmentedControl" name="Options" enabled="true" visible="true" x="50" y="300" width="200" height="44"/>
        </XCUIElementTypeApplication>`;

      const result = await processIOSPageSource(mockIOSXML);
      
      expect(result.interactiveElements.length).toBe(3);
      
      const switchElement = result.interactiveElements.find(el => el.attributes['type'] === 'XCUIElementTypeSwitch');
      const sliderElement = result.interactiveElements.find(el => el.attributes['type'] === 'XCUIElementTypeSlider');
      const segmentedElement = result.interactiveElements.find(el => el.attributes['type'] === 'XCUIElementTypeSegmentedControl');
      
      expect(switchElement?.isInteractive).toBe(true);
      expect(sliderElement?.isInteractive).toBe(true);
      expect(segmentedElement?.isInteractive).toBe(true);
    });
  });

  describe('Appium Integration', () => {
    it('should create Appium instance with iOS configuration', () => {
      const iosConfig = createIOSConfig('iPhone Simulator');
      const appium = new Appium(iosConfig);
      
      expect(appium.getPlatform()).toBe(Platform.IOS);
    });

    it('should create Appium instance with Android configuration', () => {
      const androidConfig = createAndroidConfig('Android Emulator');
      const appium = new Appium(androidConfig);
      
      expect(appium.getPlatform()).toBe(Platform.ANDROID);
    });

    it('should create iOS context with custom parameters', async () => {
      const appium = new Appium();
      
      // Mock the context creation to avoid actual Appium connection
      const mockNewIOSContext = jest.spyOn(appium, 'newIOSContext').mockImplementation(async () => {
        const mockConfig = createIOSConfig('iPhone 15 Pro', 'com.test.app', '17.0');
        return new MobileContext(mockConfig);
      });

      const context = await appium.newIOSContext('iPhone 15 Pro', 'com.test.app', '17.0');
      
      expect(mockNewIOSContext).toHaveBeenCalledWith('iPhone 15 Pro', 'com.test.app', '17.0', undefined);
      expect(context).toBeInstanceOf(MobileContext);
      
      mockNewIOSContext.mockRestore();
    });
  });

  describe('Mobile Context Platform Detection', () => {
    it('should create MobileContext with iOS configuration', () => {
      const iosConfig = createIOSConfig('iPhone Simulator');
      const context = new MobileContext(iosConfig);
      
      expect(context.getPlatform()).toBe(Platform.IOS);
    });

    it('should create MobileContext with Android configuration', () => {
      const androidConfig = createAndroidConfig('Android Emulator');
      const context = new MobileContext(androidConfig);
      
      expect(context.getPlatform()).toBe(Platform.ANDROID);
    });

    it('should default to Android when no configuration provided', () => {
      const context = new MobileContext();
      
      expect(context.getPlatform()).toBe(Platform.ANDROID);
    });
  });

  describe('Platform-specific Operations', () => {
    it('should format iOS elements correctly', async () => {
      const mockIOSXML = `<?xml version="1.0" encoding="UTF-8"?>
        <XCUIElementTypeApplication type="XCUIElementTypeApplication" name="TestApp" enabled="true" visible="true" x="0" y="0" width="375" height="812">
          <XCUIElementTypeButton type="XCUIElementTypeButton" name="Submit" label="Submit Button" enabled="true" visible="true" x="50" y="100" width="100" height="44"/>
        </XCUIElementTypeApplication>`;

      const result = await processIOSPageSource(mockIOSXML);
      const { formatElementsList } = await import('../mobile/iosViewProcessor');
      
      const formattedList = formatElementsList(result.interactiveElements);
      
      expect(formattedList).toContain('Button(');
      expect(formattedList).toContain('name=Submit');
      expect(formattedList).toContain('bounds=[50,100][150,144]');
    });

    it('should compare Android and iOS processing differences', async () => {
      // This test demonstrates the differences between Android and iOS processing
      const androidXML = `<?xml version="1.0" encoding="UTF-8"?>
        <hierarchy>
          <node class="android.widget.Button" text="Click Me" clickable="true" bounds="[50,100][150,144]"/>
        </hierarchy>`;

      const iosXML = `<?xml version="1.0" encoding="UTF-8"?>
        <XCUIElementTypeApplication type="XCUIElementTypeApplication" enabled="true" visible="true" x="0" y="0" width="375" height="812">
          <XCUIElementTypeButton type="XCUIElementTypeButton" name="Click Me" enabled="true" visible="true" x="50" y="100" width="100" height="44"/>
        </XCUIElementTypeApplication>`;

      const androidResult = await processAndroidPageSource(androidXML);
      const iosResult = await processIOSPageSource(iosXML);

      // Both should find interactive elements
      expect(androidResult.interactiveElements.length).toBeGreaterThan(0);
      expect(iosResult.interactiveElements.length).toBeGreaterThan(0);

      // But they use different attribute structures
      const androidElement = androidResult.interactiveElements[0];
      const iosElement = iosResult.interactiveElements[0];

      expect(androidElement.attributes['text']).toBe('Click Me');
      expect(androidElement.attributes['clickable']).toBe('true');

      expect(iosElement.attributes['name']).toBe('Click Me');
      expect(iosElement.attributes['enabled']).toBe('true');
    });
  });
});

// Integration test (requires actual Appium setup)
describe('iOS Integration Tests (Requires Appium)', () => {
  let appium: Appium;
  let mobileContext: MobileContext;

  beforeAll(async () => {
    // Skip these tests if SKIP_INTEGRATION_TESTS is set
    if (process.env.SKIP_INTEGRATION_TESTS === 'true') {
      return;
    }

    try {
      const iosConfig = createIOSConfig(
        process.env.IOS_DEVICE_NAME || 'iPhone Simulator',
        process.env.IOS_BUNDLE_ID,
        process.env.IOS_PLATFORM_VERSION || '17.0'
      );
      
      appium = new Appium(iosConfig);
      mobileContext = await appium.newContext();
    } catch (error) {
      console.warn('Skipping iOS integration tests - Appium not available:', error);
    }
  });

  afterAll(async () => {
    if (mobileContext) {
      await mobileContext.close();
    }
  });

  it('should connect to iOS device/simulator', async () => {
    if (!mobileContext) {
      console.log('Skipping test - no mobile context available');
      return;
    }

    expect(mobileContext.getPlatform()).toBe(Platform.IOS);
  });

  it('should get iOS app state', async () => {
    if (!mobileContext) {
      console.log('Skipping test - no mobile context available');
      return;
    }

    const state = await mobileContext.getState();
    
    expect(state.platform).toBe(Platform.IOS);
    expect(state.screenshot).toBeDefined();
    expect(state.interactiveElements).toBeDefined();
    expect(Array.isArray(state.interactiveElements)).toBe(true);
  });
});
