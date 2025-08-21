import { OptimizedNode as AndroidOptimizedNode } from './androidViewProcessor';
import { OptimizedNode as IOSOptimizedNode } from './iosViewProcessor';

// Platform types
export enum Platform {
  ANDROID = 'Android',
  IOS = 'iOS'
}

// Union type for optimized nodes
export type OptimizedNode = AndroidOptimizedNode | IOSOptimizedNode;

// Platform-specific capabilities
export interface AndroidCapabilities {
  platformName: 'Android';
  'appium:automationName': 'UiAutomator2';
  'appium:deviceName': string;
  'appium:appPackage'?: string;
  'appium:appActivity'?: string;
  'appium:noReset'?: boolean;
  'appium:newCommandTimeout'?: number;
}

export interface IOSCapabilities {
  platformName: 'iOS';
  'appium:automationName': 'XCUITest';
  'appium:deviceName': string;
  'appium:platformVersion'?: string;
  'appium:bundleId'?: string;
  'appium:noReset'?: boolean;
  'appium:newCommandTimeout'?: number;
  'appium:udid'?: string;
}

export type MobileCapabilities = AndroidCapabilities | IOSCapabilities;

// Platform configuration
export interface PlatformConfig {
  platform: Platform;
  capabilities: MobileCapabilities;
  host?: string;
  port?: number;
}

export interface MobileState {
  platform: Platform;
  currentApp: string;
  activeApps: string[];
  screenshot: string;
  interactiveElements: OptimizedNode[];
}
