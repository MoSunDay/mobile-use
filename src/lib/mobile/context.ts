import { remote } from 'webdriverio';
import { processPageSource } from './androidViewProcessor';
import { createLogger } from '@/lib/utils/logger';
import { createElementsOverlay } from './canvasOverlay';
import { MobileState } from './types';
import fs from 'fs/promises';
const logger = createLogger('MobileContext');

export default class MobileContext {
  private driver: any;
  private cachedState: MobileState | undefined;
  constructor() {
    logger.info('MobileContext constructor');
  }

  async init() {
    logger.info('MobileContext init');
    // WebdriverIO remote capabilities for already installed app
    const capabilities = {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': 'Android Emulator', // Update this to match your device name or use 'Android Device' for physical devices
      // Instead of app capability, use these for an already installed app:
      // 'appium:appPackage': 'com.android.chrome', // app package
      // 'appium:appActivity': 'com.android.chrome.MainActivity', // Replace with the actual main activity if different
      'appium:noReset': true, // Keep app data between sessions
      'appium:newCommandTimeout': 120, // Increase timeout for long-running commands
    };

    const wdOpts = {
      hostname: process.env.APPIUM_HOST || 'localhost',
      port: parseInt(process.env.APPIUM_PORT || '4723'),
      logLevel: 'error' as const,
      capabilities,
    };

    // Connect to the Appium server
    logger.info('Connecting to Appium server...');
    this.driver = await remote(wdOpts);
  }

  public async close(): Promise<void> {
    logger.info('MobileContext close');
    await this.driver.deleteSession();
  }

  async getState(): Promise<MobileState> {
    logger.info('MobileContext getState');
    const driver = this.driver;
    // Take a screenshot at the beginning
    const screenshotPath = 'tmp/state.png';
    await driver.saveScreenshot(screenshotPath);
    logger.info(`Saved initial screenshot to ${screenshotPath}`);

    // Get page source to analyze the UI structure instead of using getViewHierarchy
    logger.info('Getting page source to analyze UI elements...');
    const pageSource = await driver.getPageSource();

    // Process the hierarchy data (no file operations)
    logger.info('Optimizing view hierarchy...');
    const { interactiveElements } = await processPageSource(pageSource);

    // Create and save the overlay image
    logger.info('Creating element overlay...');
    const overlayPath = 'tmp/state-overlay.png';
    await createElementsOverlay(screenshotPath, interactiveElements, overlayPath);
    //get base64 screenshot string from overlayPath
    const screenshotString = await this.getBase64String(overlayPath);
    const currentApp = await driver.getCurrentPackage();
    const activeApps = ['']; //await driver.getAppList()?;
    this.cachedState = {
      currentApp,
      activeApps,
      screenshot: screenshotString,
      interactiveElements,
    };
    return this.cachedState;
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
    // await driver.hideKeyboard(); //trick to make pointer click actions work?
    const element = this.cachedState?.interactiveElements[index];
    if (!element) {
      throw new Error(`Element at index ${index} not found`);
    }
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
    // Release the actions
    await driver.releaseActions();

    await driver.pause(500);
    logger.info(`Clicked element at index ${index}`);
  }

  async inputText(index: number, text: string) {
    const driver = this.driver;
    const element = this.cachedState?.interactiveElements[index];
    if (!element) {
      throw new Error(`Element at index ${index} not found`);
    }
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
    await driver.pause(500);
    logger.info(`Input text into element at index ${index}`);
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
    // Scroll to the element with text "Target Element"
    await driver.$(
      `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().text("${text}"))`
    );
    await driver.pause(500);
    logger.info(`Scrolled to text ${text}`);
  }
}
