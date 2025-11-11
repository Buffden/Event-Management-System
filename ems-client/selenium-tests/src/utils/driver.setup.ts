import { Builder, Capabilities, WebDriver } from 'selenium-webdriver';
import config from '../config/test.config';

/**
 * Creates and configures a Selenium WebDriver instance
 * @returns {Promise<WebDriver>} Configured WebDriver instance
 */
export async function createDriver(): Promise<WebDriver> {
  let capabilities: Capabilities;

  switch (config.browser.name.toLowerCase()) {
    case 'chrome':
      capabilities = Capabilities.chrome();
      if (config.browser.headless) {
        capabilities.set('goog:chromeOptions', {
          args: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
        });
      }
      break;
    case 'firefox':
      capabilities = Capabilities.firefox();
      if (config.browser.headless) {
        capabilities.set('moz:firefoxOptions', {
          args: ['--headless']
        });
      }
      break;
    case 'edge':
      capabilities = Capabilities.edge();
      if (config.browser.headless) {
        capabilities.set('ms:edgeOptions', {
          args: ['--headless']
        });
      }
      break;
    default:
      throw new Error(`Unsupported browser: ${config.browser.name}`);
  }

  const driver = await new Builder()
    .forBrowser(config.browser.name)
    .withCapabilities(capabilities)
    .build();

  // Set timeouts
  await driver.manage().setTimeouts({
    implicit: config.timeouts.implicit,
    pageLoad: config.timeouts.pageLoad,
    script: config.timeouts.script
  });

  // Set window size
  await driver.manage().window().setRect({
    width: config.browser.windowSize.width,
    height: config.browser.windowSize.height
  });

  return driver;
}

/**
 * Quits the WebDriver instance
 * @param {WebDriver} driver - WebDriver instance to quit
 */
export async function quitDriver(driver: WebDriver | null | undefined): Promise<void> {
  if (driver) {
    await driver.quit();
  }
}

