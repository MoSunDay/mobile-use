import { OptimizedNode } from './androidViewProcessor';

export interface MobileState {
  currentApp: string;
  activeApps: string[];
  screenshot: string;
  interactiveElements: OptimizedNode[];
}
