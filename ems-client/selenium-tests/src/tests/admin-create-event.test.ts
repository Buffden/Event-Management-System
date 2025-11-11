import { WebDriver, By, until } from 'selenium-webdriver';
import { createDriver, quitDriver } from '../utils/driver.setup';
import config from '../config/test.config';
import {
  navigateTo,
  clickByTestId,
  typeByTestId,
  waitForUrl,
  takeScreenshot,
  clickByXPath,
  typeByCss,
  waitForVisibleByCss,
} from '../utils/helpers';

function formatForDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hour}:${min}`;
}

describe('Admin Create Event Flow', () => {
  let driver: WebDriver | null = null;

  beforeAll(async () => {
    driver = await createDriver();
  }, 30000);

  afterAll(async () => {
    if (driver) await quitDriver(driver);
  }, 20000);

  it('should login as admin, navigate to create event page, fill form and create event', async () => {
    if (!driver) throw new Error('Driver not initialized');

    // Step 1: Login
    await navigateTo(driver, '/');
    await driver.sleep(1000);
    await clickByTestId(driver, 'landing-sign-in-button');
    await waitForUrl(driver, '/login', 10000);

    await typeByTestId(driver, 'login-email-input', config.credentials.validUser.email);
    await typeByTestId(driver, 'login-password-input', config.credentials.validUser.password);
    await takeScreenshot(driver, 'admin-create-event-01-login-filled');

    await clickByTestId(driver, 'login-submit-button');
    await waitForUrl(driver, '/dashboard', 15000);
    await driver.sleep(2000); // Wait for dashboard to load

    // Step 2: Navigate to admin events page
    await navigateTo(driver, '/dashboard/admin/events');
    await driver.sleep(2000); // Wait for page to load

    // Step 3: Click Create Event button
    const createButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Create Event')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(createButton), 10000);
    await createButton.click();
    await waitForUrl(driver, '/dashboard/admin/events/create', 10000);
    await driver.sleep(2000); // Wait for form to load

    // Step 4: Wait for venues to load (check that loading spinner is gone)
    if (!driver) throw new Error('Driver not initialized');
    const driverRef = driver; // Capture for use in callback
    await driver.wait(async () => {
      try {
        const loadingText = await driverRef.findElement(By.xpath("//span[contains(., 'Loading venues...')]"));
        return !(await loadingText.isDisplayed());
      } catch {
        // Loading text not found, venues are loaded
        return true;
      }
    }, 15000);

    // Step 5: Fill form fields
    // Compute start/end as close to input time as possible
    const eventName = `Selenium Test Event ${Date.now()}`;
    const eventCategory = 'Testing';
    const eventDescription = 'Automated test event created by Selenium.';
    const bannerUrl = 'https://example.com/image.jpg';

    // Fill text fields
    await typeByCss(driver, '#name', eventName);
    await driver.sleep(300);
    await typeByCss(driver, '#category', eventCategory);
    await driver.sleep(300);
    await typeByCss(driver, '#description', eventDescription);
    await driver.sleep(300);
    await typeByCss(driver, '#bannerImageUrl', bannerUrl);
    await driver.sleep(300);

    // Select a venue - wait for select to be enabled and have options
    const venueSelect = await waitForVisibleByCss(driver, '#venueId');
    await driver.wait(until.elementIsEnabled(venueSelect), 10000);

    // Wait for at least one venue option (not just the placeholder)
    await driver.wait(async () => {
      const options = await venueSelect.findElements(By.css('option'));
      return options.length > 1;
    }, 10000);

    // Select the first actual venue (index 1, since 0 is placeholder)
    await venueSelect.click();
    await driver.sleep(200);
    const options = await venueSelect.findElements(By.css('option'));
    if (options.length > 1 && options[1]) {
      await options[1].click(); // Select first venue (skip placeholder)
    }
    await driver.sleep(300);

    // Recompute times right before setting datetime-local values
    const nowAtSet = new Date();
    const start = new Date(nowAtSet.getTime() + 5 * 60 * 1000);
    const end = new Date(start.getTime() + 10 * 60 * 1000);

    const startStr = formatForDatetimeLocal(start);
    const endStr = formatForDatetimeLocal(end);

    // Set start date - use JavaScript to set value directly
    const startEl = await waitForVisibleByCss(driver, '#bookingStartDate');
    await startEl.click();
    await driver.sleep(200);

    // Use JavaScript to set the value and trigger events
    await driver.executeScript(`
      const el = document.getElementById('bookingStartDate');
      if (el) {
        const val = arguments[0];
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    `, startStr);
    await driver.sleep(500);

    // Verify start date was set - wait for it to be set
    await driver.wait(async () => {
      const value = await startEl.getAttribute('value');
      return value === startStr;
    }, 5000).catch(async () => {
      // If still not set, try sendKeys as fallback
      await startEl.clear();
      await startEl.click();
      await driver.sleep(100);
      for (const char of startStr) {
        await startEl.sendKeys(char);
        await driver.sleep(10);
      }
      await driver.sleep(300);
    });

    // Set end date - use JavaScript to set value directly
    const endEl = await waitForVisibleByCss(driver, '#bookingEndDate');
    await endEl.click();
    await driver.sleep(200);

    // Use JavaScript to set the value and trigger events
    await driver.executeScript(`
      const el = document.getElementById('bookingEndDate');
      if (el) {
        const val = arguments[0];
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, val);
        } else {
          el.value = val;
        }
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      }
    `, endStr);
    await driver.sleep(500);

    // Verify end date was set - wait for it to be set
    await driver.wait(async () => {
      const value = await endEl.getAttribute('value');
      return value === endStr;
    }, 5000).catch(async () => {
      // If still not set, try sendKeys as fallback
      await endEl.clear();
      await endEl.click();
      await driver.sleep(100);
      for (const char of endStr) {
        await endEl.sendKeys(char);
        await driver.sleep(10);
      }
      await driver.sleep(300);
    });

    await driver.sleep(1000); // Additional wait for React to process

    await takeScreenshot(driver, 'admin-create-event-02-form-filled');

    // Step 6: Submit the form
    const submitButton = await driver.wait(
      until.elementLocated(By.xpath("//button[@type='submit' and contains(., 'Create & Publish Event')]")),
      10000
    );
    await driver.wait(until.elementIsEnabled(submitButton), 10000);
    await submitButton.click();
    await driver.sleep(1000);

    // Step 7: Wait for success message or redirect
    // The page shows a success message first, then redirects after 2 seconds
    try {
      // Wait for success message to appear
      await driver.wait(
        until.elementLocated(By.xpath("//h3[contains(., 'Event Created & Published')]")),
        10000
      );
      await takeScreenshot(driver, 'admin-create-event-03-success-message');

      // Wait for redirect to events page
      await waitForUrl(driver, '/dashboard/admin/events', 15000);
      await driver.sleep(2000);
      await takeScreenshot(driver, 'admin-create-event-04-completed');

      // Verify we're on the events page
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/dashboard/admin/events');
    } catch (error) {
      // If success message doesn't appear, check for errors
      if (!driver) throw new Error('Driver not initialized');
      const errorElements = await driver.findElements(By.css('.text-red-600, .text-red-400'));
      if (errorElements.length > 0 && errorElements[0]) {
        const errorText = await errorElements[0].getText();
        throw new Error(`Form submission failed with error: ${errorText}`);
      }
      throw error;
    }
  }, 120000);

  it('should not allow creating an event during 1:00 AM - 2:00 AM due to venue conflict', async () => {
    if (!driver) throw new Error('Driver not initialized');

    // Ensure we're on the admin events page
    await navigateTo(driver, '/dashboard/admin/events');
    await driver.sleep(1500);

    // Open create event form
    const createButton = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Create Event')]")),
      10000
    );
    await driver.wait(until.elementIsVisible(createButton), 10000);
    await createButton.click();
    await waitForUrl(driver, '/dashboard/admin/events/create', 10000);
    await driver.sleep(1500);

    // Wait for venues to load
    const driverRef = driver;
    await driver.wait(async () => {
      try {
        const loadingText = await driverRef.findElement(By.xpath("//span[contains(., 'Loading venues...')]"));
        return !(await loadingText.isDisplayed());
      } catch {
        return true;
      }
    }, 15000);

    // Fill basic fields
    const eventName = `Selenium Night Event ${Date.now()}`;
    await typeByCss(driver, '#name', eventName);
    await driver.sleep(200);
    await typeByCss(driver, '#category', 'Testing');
    await driver.sleep(200);
    await typeByCss(driver, '#description', 'Attempt to create event in restricted midnight window.');
    await driver.sleep(200);
    await typeByCss(driver, '#bannerImageUrl', 'https://example.com/banner.jpg');

    // Select first available venue (skip placeholder)
    const venueSelect = await waitForVisibleByCss(driver, '#venueId');
    await driver.wait(until.elementIsEnabled(venueSelect), 10000);
    await driver.wait(async () => {
      const options = await venueSelect.findElements(By.css('option'));
      return options.length > 1;
    }, 10000);
    await venueSelect.click();
    await driver.sleep(150);
    const options = await venueSelect.findElements(By.css('option'));
    if (options.length > 1 && options[1]) {
      await options[1].click();
    }

    // Compute next day's 1:00 AM and 2:00 AM
    const now = new Date();
    const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0, 0, 0);
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 2, 0, 0, 0);
    const startStr = formatForDatetimeLocal(nextDay);
    const endStr = formatForDatetimeLocal(endTime);

    // Set datetime-local values reliably
    const startEl = await waitForVisibleByCss(driver, '#bookingStartDate');
    await startEl.click();
    await driver.sleep(100);
    await driver.executeScript(`
      const el = document.getElementById('bookingStartDate');
      if (el) {
        el.value = arguments[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `, startStr);
    await driver.sleep(300);

    const endEl = await waitForVisibleByCss(driver, '#bookingEndDate');
    await endEl.click();
    await driver.sleep(100);
    await driver.executeScript(`
      const el = document.getElementById('bookingEndDate');
      if (el) {
        el.value = arguments[0];
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    `, endStr);
    await driver.sleep(300);

    await takeScreenshot(driver, 'admin-create-event-midnight-01-form-filled');

    // Submit the form
    const submitButton = await driver.wait(
      until.elementLocated(By.xpath("//button[@type='submit' and contains(., 'Create & Publish Event')]")),
      10000
    );
    await driver.wait(until.elementIsEnabled(submitButton), 10000);
    await submitButton.click();

    // Expect an error message and no redirect
    // Look for the specific error text on the page
    const errorLocator = By.xpath("//*[contains(text(), 'Venue is not available for the selected booking period')]");

    // Wait up to 10s for the error
    const errorElement = await driver.wait(until.elementLocated(errorLocator), 10000);
    await driver.wait(until.elementIsVisible(errorElement), 10000);
    const errorText = await errorElement.getText();
    expect(errorText).toMatch(/Venue is not available for the selected booking period/i);

    // Ensure we did NOT redirect to events list
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/dashboard/admin/events/create');
  }, 90000);
});
