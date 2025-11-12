import { By, until, WebDriver, WebElement, Key } from 'selenium-webdriver';
import config from '../config/test.config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Wait for an element to be present and visible
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} locator - Element locator (CSS selector, XPath, etc.)
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<WebElement>} The found element
 */
export async function waitForElement(
  driver: WebDriver,
  locator: string,
  timeout: number = 10000
): Promise<WebElement> {
  const element = await driver.wait(
    until.elementLocated(By.css(locator)),
    timeout
  );
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

/**
 * Wait for an element by test ID
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<WebElement>} The found element
 */
export async function waitForElementByTestId(
  driver: WebDriver,
  testId: string,
  timeout: number = 10000
): Promise<WebElement> {
  const locator = By.css(`[data-testid="${testId}"]`);
  const element = await driver.wait(
    until.elementLocated(locator),
    timeout
  );
  await driver.wait(until.elementIsVisible(element), timeout);
  return element;
}

/**
 * Click an element by test ID
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 */
export async function clickByTestId(driver: WebDriver, testId: string): Promise<void> {
  const element = await waitForElementByTestId(driver, testId);
  await element.click();
}

/**
 * Type text into an input field by test ID
 * Uses JavaScript to set value for React controlled inputs, then triggers events
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 * @param {string} text - Text to type
 */
export async function typeByTestId(driver: WebDriver, testId: string, text: string): Promise<void> {
  const element = await waitForElementByTestId(driver, testId);

  // Wait for element to be enabled
  await driver.wait(until.elementIsEnabled(element), 10000);

  // Scroll element into view
  await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', element);
  await driver.sleep(150);

  // Click to focus the element
  await element.click();
  await driver.sleep(200);

  // Clear any existing value first - try multiple methods
  try {
    await element.clear();
  } catch (e) {
    // If clear fails, try Ctrl+A and Delete
    await element.sendKeys(Key.CONTROL + 'a');
    await element.sendKeys(Key.DELETE);
  }
  await driver.sleep(100);

  // Use sendKeys to type the text - this is more reliable for React controlled inputs
  // Type character by character with small delays to ensure React processes each keystroke
  for (let i = 0; i < text.length; i++) {
    await element.sendKeys(text[i]);
    // Small delay between characters to allow React to process
    if (i % 5 === 0) {
      await driver.sleep(50); // Slightly longer delay every 5 characters
    } else {
      await driver.sleep(20);
    }
  }

  // Wait for React to process the change
  await driver.sleep(300);

  // Verify the text was entered (for non-password fields)
  const inputType = await element.getAttribute('type');
  if (inputType !== 'password') {
    // Wait a bit more and check value
    await driver.sleep(200);
    let value = await element.getAttribute('value');

    // If value doesn't match, try again with JavaScript approach using testId
    if (value !== text) {
      try {
        // Use testId to find element in JavaScript context
        await driver.executeScript(`
          (function() {
            const testId = arguments[0];
            const value = arguments[1];
            const element = document.querySelector('[data-testid="' + testId + '"]');

            if (!element) {
              throw new Error('Element not found with testId: ' + testId);
            }

            // Get the native value setter to bypass React's control
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;

            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(element, value);
            } else {
              element.value = value;
            }

            // Trigger React's synthetic events
            element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
          })();
        `, testId, text);

        await driver.sleep(300);
        value = await element.getAttribute('value');
      } catch (err) {
        console.warn('JavaScript fallback failed:', err);
      }
    }
  } else {
    // For password fields, just ensure we wait long enough
    await driver.sleep(200);
  }
}

/**
 * Wait for an input field to have a specific value
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 * @param {string} expectedValue - Expected value
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<boolean>} True if value matches, false if timeout
 */
export async function waitForInputValue(
  driver: WebDriver,
  testId: string,
  expectedValue: string,
  timeout: number = 10000
): Promise<boolean> {
  try {
    await driver.wait(async () => {
      try {
        const element = await driver.findElement(By.css(`[data-testid="${testId}"]`));
        const value = await element.getAttribute('value');
        return value === expectedValue;
      } catch {
        return false;
      }
    }, timeout);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content of an element by test ID
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 * @returns {Promise<string>} Text content
 */
export async function getTextByTestId(driver: WebDriver, testId: string): Promise<string> {
  const element = await waitForElementByTestId(driver, testId);
  return await element.getText();
}

/**
 * Check if an element is visible by test ID
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} testId - Test ID attribute value
 * @returns {Promise<boolean>} True if visible, false otherwise
 */
export async function isVisibleByTestId(driver: WebDriver, testId: string): Promise<boolean> {
  try {
    const element = await waitForElementByTestId(driver, testId, 2000);
    return await element.isDisplayed();
  } catch (error) {
    return false;
  }
}

/**
 * Navigate to a URL
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} path - Path to navigate to (relative to baseUrl)
 */
export async function navigateTo(driver: WebDriver, path: string = ''): Promise<void> {
  const url = path.startsWith('http') ? path : `${config.baseUrl}${path}`;
  await driver.get(url);
}

/**
 * Take a screenshot
 * @param {WebDriver} driver - WebDriver instance
 * @param {string} filename - Filename for the screenshot
 */
export async function takeScreenshot(driver: WebDriver, filename: string): Promise<void> {
  if (config.screenshots.enabled) {
    const screenshot = await driver.takeScreenshot();
    const screenshotDir = path.resolve(config.screenshots.directory);

    // Create directory if it doesn't exist
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filepath = path.join(screenshotDir, `${filename}.png`);
    fs.writeFileSync(filepath, screenshot, 'base64');
    console.log(`Screenshot saved: ${filepath}`);
  }
}

/**
 * Wait for URL to match a pattern
 * @param {WebDriver} driver - WebDriver instance
 * @param {string|RegExp} urlPattern - URL pattern to match
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 */
export async function waitForUrl(
  driver: WebDriver,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  await driver.wait(async () => {
    const currentUrl = await driver.getCurrentUrl();
    if (typeof urlPattern === 'string') {
      return currentUrl.includes(urlPattern);
    } else {
      return urlPattern.test(currentUrl);
    }
  }, timeout);
}

// New helpers for CSS/XPath based interactions
export async function clickByCss(driver: WebDriver, cssSelector: string, timeout: number = 10000): Promise<void> {
  const element = await waitForElement(driver, cssSelector, timeout);
  await element.click();
}

export async function clickByXPath(driver: WebDriver, xpath: string, timeout: number = 10000): Promise<void> {
  const element = await driver.wait(until.elementLocated(By.xpath(xpath)), timeout);
  await driver.wait(until.elementIsVisible(element), timeout);
  await element.click();
}

export async function typeByCss(driver: WebDriver, cssSelector: string, text: string, timeout: number = 10000): Promise<void> {
  const element = await waitForElement(driver, cssSelector, timeout);
  await driver.wait(until.elementIsEnabled(element), timeout);
  await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', element);
  await element.click();
  try {
    await element.clear();
  } catch (_) {}
  for (const ch of text) {
    await element.sendKeys(ch);
    await driver.sleep(10);
  }
}

export async function selectOptionByCssIndex(driver: WebDriver, selectCss: string, optionIndex: number, timeout: number = 10000): Promise<void> {
  const selectEl = await waitForElement(driver, selectCss, timeout);
  await driver.wait(until.elementIsEnabled(selectEl), timeout);
  await selectEl.click();
  const option = await driver.findElement(By.css(`${selectCss} option:nth-child(${optionIndex})`));
  await option.click();
}

export async function waitForVisibleByCss(driver: WebDriver, cssSelector: string, timeout: number = 10000): Promise<WebElement> {
  return await waitForElement(driver, cssSelector, timeout);
}

