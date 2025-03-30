import { createLogger } from '@/lib/utils/logger';
import MobileContext from './context';

const logger = createLogger('Appium');

export default class Appium {
  constructor() {
    logger.info('Appium constructor');
  }

  async init() {
    logger.info('Appium init');
    //start appium server
    //npm run appium on terminal for now
    console.log('do `npm run appium` on terminal for now');
  }

  async newContext(): Promise<MobileContext> {
    logger.info('creating new mobileContext');
    const mobileContext = new MobileContext();
    await mobileContext.init();
    return mobileContext;
  }
}
