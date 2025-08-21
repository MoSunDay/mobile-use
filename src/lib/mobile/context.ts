import { remote } from 'webdriverio';
import { processPageSource as processAndroidPageSource } from './androidViewProcessor';
import { processPageSource as processIOSPageSource } from './iosViewProcessor';
import { createLogger } from '@/lib/utils/logger';
import { createElementsOverlay } from './canvasOverlay';
import { MobileState, Platform, PlatformConfig, MobileCapabilities } from './types';
import fs from 'fs/promises';
const logger = createLogger('MobileContext');

const TMP_DIR = 'tmp';

export default class MobileContext {
  private driver: any;
  private cachedState: MobileState | undefined;
  private platformConfig: PlatformConfig;

  constructor(platformConfig?: PlatformConfig) {
    logger.info('MobileContext constructor');
    // Default to Android if no config provided
    this.platformConfig = platformConfig || this.getDefaultAndroidConfig();
  }

  private getDefaultAndroidConfig(): PlatformConfig {
    return {
      platform: Platform.ANDROID,
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'Android Emulator',
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
        'appium:deviceName': 'iPhone Simulator',
        'appium:platformVersion': '17.0',
        'appium:noReset': true,
        'appium:newCommandTimeout': 120,
      },
      host: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
    };
  }

  public setPlatformConfig(config: PlatformConfig): void {
    this.platformConfig = config;
    logger.info(`Platform config set to: ${config.platform}`);
  }

  public getPlatform(): Platform {
    return this.platformConfig.platform;
  }

  private async ensureTmpDir() {
    try {
      await fs.mkdir(TMP_DIR, { recursive: true });
      logger.info(`Ensured ${TMP_DIR} directory exists`);
    } catch (err) {
      logger.error(`Failed to ensure ${TMP_DIR} directory exists:`, err);
    }
  }

  async init() {
    logger.info(`MobileContext init for platform: ${this.platformConfig.platform}`);

    const wdOpts = {
      hostname: this.platformConfig.host || 'localhost',
      port: this.platformConfig.port || 4723,
      logLevel: 'error' as const,
      capabilities: this.platformConfig.capabilities,
    };

    await this.ensureTmpDir();
    // Connect to the Appium server
    logger.info(`Connecting to Appium server for ${this.platformConfig.platform}...`);
    this.driver = await remote(wdOpts);
  }

  public async close(): Promise<void> {
    logger.info('MobileContext close');
    await this.driver.deleteSession();
  }

  async getState(): Promise<MobileState> {
    logger.info(`MobileContext getState for ${this.platformConfig.platform}`);
    const driver = this.driver;
    // Take a screenshot at the beginning
    const screenshotPath = 'tmp/state.png';
    await driver.saveScreenshot(screenshotPath);
    logger.info(`Saved initial screenshot to ${screenshotPath}`);

    // Get page source to analyze the UI structure
    logger.info('Getting page source to analyze UI elements...');
    const pageSource = await driver.getPageSource();

    // Process the hierarchy data based on platform
    logger.info('Optimizing view hierarchy...');
    const { interactiveElements } = this.platformConfig.platform === Platform.ANDROID
      ? await processAndroidPageSource(pageSource)
      : await processIOSPageSource(pageSource);

    // Create and save the overlay image
    logger.info('Creating element overlay...');
    const overlayPath = 'tmp/state-overlay.png';
    await createElementsOverlay(screenshotPath, interactiveElements, overlayPath);
    //get base64 screenshot string from overlayPath
    const screenshotString = await this.getBase64String(overlayPath);

    // Get current app based on platform
    const currentApp = this.platformConfig.platform === Platform.ANDROID
      ? await driver.getCurrentPackage()
      : await this.getIOSCurrentApp(driver);

    const activeApps = ['']; //await driver.getAppList()?;
    this.cachedState = {
      platform: this.platformConfig.platform,
      currentApp,
      activeApps,
      screenshot: screenshotString,
      interactiveElements,
    };
    return this.cachedState;
  }

  private async getIOSCurrentApp(driver: any): Promise<string> {
    try {
      // For iOS, we can get the bundle ID of the current app
      const bundleId = await driver.getCurrentPackage();
      return bundleId || 'Unknown iOS App';
    } catch (error) {
      logger.warn('Could not get iOS current app:', error);
      return 'Unknown iOS App';
    }
  }

  async base64Screenshot() {
    const driver = this.driver;
    // Capture the screenshot as a Base64-encoded string
    const base64Screenshot = await driver.takeScreenshot();
    return base64Screenshot;
  }

  private async getBase64String(path: string): Promise<string> {
    const screenshot = await fs.readFile(path);
    return screenshot.toString('base64');
  }

  async clickElement(index: number) {
    const driver = this.driver;
    const element = this.cachedState?.interactiveElements[index];
    if (!element) {
      throw new Error(`Element at index ${index} not found`);
    }

    if (this.platformConfig.platform === Platform.ANDROID) {
      // Android-specific click implementation
      const bounds = element.bounds!;
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;

      // Perform the tap action using the W3C Actions API
      await driver.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: x, y: y },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ]);
      await driver.releaseActions();
    } else {
      // iOS-specific click implementation
      try {
        // Try to find element by accessibility attributes first
        let iosElement = null;

        if (element.attributes['name']) {
          iosElement = await driver.$(`*[name="${element.attributes['name']}"]`);
        } else if (element.attributes['label']) {
          iosElement = await driver.$(`*[label="${element.attributes['label']}"]`);
        } else if (element.attributes['value']) {
          iosElement = await driver.$(`*[value="${element.attributes['value']}"]`);
        }

        if (iosElement && await iosElement.isExisting()) {
          await iosElement.click();
        } else {
          // Fallback to coordinate-based click
          const bounds = element.bounds!;
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;

          await driver.performActions([
            {
              type: 'pointer',
              id: 'finger1',
              parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 },
              ],
            },
          ]);
          await driver.releaseActions();
        }
      } catch (error) {
        logger.warn('iOS click failed, falling back to coordinates:', error);
        // Coordinate-based fallback
        const bounds = element.bounds!;
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;

        await driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: x, y: y },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ]);
        await driver.releaseActions();
      }
    }

    await driver.pause(500);
    logger.info(`Clicked element at index ${index} on ${this.platformConfig.platform}`);
  }

  async inputText(index: number, text: string) {
    const driver = this.driver;
    const element = this.cachedState?.interactiveElements[index];
    if (!element) {
      throw new Error(`Element at index ${index} not found`);
    }

    if (this.platformConfig.platform === Platform.ANDROID) {
      // Android-specific input implementation
      const bounds = element.bounds!;
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;

      await driver.performActions([
        {
          type: 'pointer',
          id: 'finger1',
          parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, x: x, y: y },
            { type: 'pointerDown', button: 0 },
            { type: 'pointerUp', button: 0 },
          ],
        },
      ]);
      await driver.releaseActions();
      await driver.keys(text);
    } else {
      // iOS-specific input implementation
      try {
        // Try to find element by accessibility attributes first
        let iosElement = null;

        if (element.attributes['name']) {
          iosElement = await driver.$(`*[name="${element.attributes['name']}"]`);
        } else if (element.attributes['label']) {
          iosElement = await driver.$(`*[label="${element.attributes['label']}"]`);
        } else if (element.attributes['value']) {
          iosElement = await driver.$(`*[value="${element.attributes['value']}"]`);
        }

        if (iosElement && await iosElement.isExisting()) {
          await iosElement.click();
          await iosElement.clearValue();
          await iosElement.setValue(text);
        } else {
          // Fallback to coordinate-based input
          const bounds = element.bounds!;
          const x = bounds.x + bounds.width / 2;
          const y = bounds.y + bounds.height / 2;

          await driver.performActions([
            {
              type: 'pointer',
              id: 'finger1',
              parameters: { pointerType: 'touch' },
              actions: [
                { type: 'pointerMove', duration: 0, x: x, y: y },
                { type: 'pointerDown', button: 0 },
                { type: 'pointerUp', button: 0 },
              ],
            },
          ]);
          await driver.releaseActions();
          await driver.keys(text);
        }
      } catch (error) {
        logger.warn('iOS input failed, falling back to coordinates:', error);
        // Coordinate-based fallback
        const bounds = element.bounds!;
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;

        await driver.performActions([
          {
            type: 'pointer',
            id: 'finger1',
            parameters: { pointerType: 'touch' },
            actions: [
              { type: 'pointerMove', duration: 0, x: x, y: y },
              { type: 'pointerDown', button: 0 },
              { type: 'pointerUp', button: 0 },
            ],
          },
        ]);
        await driver.releaseActions();
        await driver.keys(text);
      }
    }

    await driver.pause(500);
    logger.info(`Input text into element at index ${index} on ${this.platformConfig.platform}`);
  }

  async scrollDown(amount: number) {
    const driver = this.driver;
    // Get the screen size of the device
    const windowSize = await driver.getWindowRect();
    const startX = windowSize.width / 2;
    const startY = windowSize.height * 0.8; // Start from the bottom of the screen
    const endY = windowSize.height * 0.2; // Swipe to the top of the screen

    // Perform the swipe gesture
    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 500, x: startX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);

    // Release actions after performing
    await driver.releaseActions();
    await driver.pause(500);
    logger.info(`Scrolled down by a page`);
  }

  async scrollUp(amount: number) {
    const driver = this.driver;
    // Get the screen size of the device
    const windowSize = await driver.getWindowRect();
    const startX = windowSize.width / 2;
    const startY = windowSize.height * 0.2; // Start from the top of the screen
    const endY = windowSize.height * 0.8; // Swipe to the bottom of the screen

    await driver.performActions([
      {
        type: 'pointer',
        id: 'finger1',
        parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, x: startX, y: startY },
          { type: 'pointerDown', button: 0 },
          { type: 'pointerMove', duration: 500, x: startX, y: endY },
          { type: 'pointerUp', button: 0 },
        ],
      },
    ]);
    await driver.releaseActions();
    await driver.pause(500);
    logger.info(`Scrolled up by a page`);
  }

  async scrollToText(text: string) {
    const driver = this.driver;

    if (this.platformConfig.platform === Platform.ANDROID) {
      // Android-specific scroll to text
      await driver.$(
        `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${text}"))`
      );
    } else {
      // iOS-specific scroll to text
      try {
        // For iOS, we need to find the element and scroll to it
        const element = await driver.$(`*[name="${text}"]`);
        if (await element.isExisting()) {
          await driver.execute('mobile: scroll', { element: element.elementId, toVisible: true });
        } else {
          // If element not found by name, try by label
          const labelElement = await driver.$(`*[label="${text}"]`);
          if (await labelElement.isExisting()) {
            await driver.execute('mobile: scroll', { element: labelElement.elementId, toVisible: true });
          }
        }
      } catch (error) {
        logger.warn(`Could not scroll to text "${text}" on iOS:`, error);
        // Fallback to manual scroll
        await this.scrollDown(1);
      }
    }

    await driver.pause(500);
    logger.info(`Scrolled to text ${text} on ${this.platformConfig.platform}`);
  }
}
