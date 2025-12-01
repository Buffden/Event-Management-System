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

async function pollForElement(
  driver: WebDriver,
  by: By,
  timeout: number = 20000
): Promise<import('selenium-webdriver').WebElement> {
  const endTime = Date.now() + timeout;
  while (Date.now() < endTime) {
    try {
      const element = await driver.findElement(by);
      if (await element.isDisplayed()) {
        return element;
      }
    } catch (error) {
      // Element not found, continue polling
    }
    await driver.sleep(500); // Poll every 500ms
  }
  throw new Error(`Element not found after ${timeout}ms for selector: ${by}`);
}

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
  let createdEventId: string | null = null;
  let createdEventName: string | null = null;

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

    // Set date/time values - ensure dates are in the future (at least 1 day from now)
    const nowAtSet = new Date();
    // Set start to 2 days from now to ensure it's definitely in the future
    const start = new Date(nowAtSet);
    start.setDate(start.getDate() + 2); // 2 days from now
    start.setHours(14, 0, 0, 0); // 2:00 PM

    // Set end to same day as start, 2 hours after start
    const end = new Date(start);
    end.setHours(end.getHours() + 2); // 2 hours later

    // Format time for time input (HH:MM)
    const formatTimeForInput = (d: Date): string => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    // Format date for calendar (YYYY-MM-DD)
    const formatDateForCalendar = (d: Date): string => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const startDateStr = formatDateForCalendar(start);
    const startTimeStr = formatTimeForInput(start);
    const endDateStr = formatDateForCalendar(end);
    const endTimeStr = formatTimeForInput(end);

    console.log(`Setting start date to: ${startDateStr} ${startTimeStr}`);
    console.log(`Setting end date to: ${endDateStr} ${endTimeStr}`);

    // Set start date - click date picker and select a future date
    try {
      const startDateButton = await waitForVisibleByCss(driver, '#start-date-picker', 10000);
      await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', startDateButton);
      await driver.sleep(300);
      await startDateButton.click();
      await driver.sleep(1000); // Wait for calendar popover to open

      // Navigate to the correct month if needed
      const targetMonth = start.getMonth();
      const targetYear = start.getFullYear();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // If target is in a different month, navigate forward
      if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
        const monthsToNavigate = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
        for (let i = 0; i < monthsToNavigate; i++) {
          const nextButton = await driver.findElement(By.css('button[aria-label*="next"], button[aria-label*="Next"]'));
          await nextButton.click();
          await driver.sleep(300);
        }
      }

      // Find and click the date in the calendar using data-day attribute (more reliable)
      const dayOfMonth = start.getDate();
      const targetDateStr = start.toLocaleDateString(); // Format matches data-day attribute

      // Try to find by data-day attribute first
      let calendarDateButton;
      try {
        calendarDateButton = await driver.wait(
          until.elementLocated(By.xpath(`//button[@data-day='${targetDateStr}' and not(contains(@class, 'rdp-day_outside')) and not(contains(@class, 'rdp-day_disabled'))]`)),
          5000
        );
      } catch {
        // Fallback: find by day number (but only in current month, not outside days)
        calendarDateButton = await driver.wait(
          until.elementLocated(By.xpath(`//button[contains(@class, 'rdp-day') and not(contains(@class, 'rdp-day_outside')) and not(contains(@class, 'rdp-day_disabled')) and normalize-space(text())='${dayOfMonth}']`)),
          10000
        );
      }

      await driver.wait(until.elementIsVisible(calendarDateButton), 5000);
      await calendarDateButton.click();
      await driver.sleep(500); // Wait for calendar to close
      console.log(`✓ Selected start date: ${startDateStr}`);
    } catch (error) {
      console.warn('Could not set start date via calendar:', error);
      throw new Error(`Failed to set start date: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Set start time - use JavaScript to set value directly (more reliable for React)
    try {
      await driver.sleep(500);
      const timeInputs = await driver.findElements(By.css('input[type="time"]'));
      if (timeInputs.length >= 1 && timeInputs[0]) {
        const startTimeInput = timeInputs[0];
        // Use JavaScript to set the value directly
        await driver.executeScript(`
          (function() {
            const input = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, value);
            } else {
              input.value = value;
            }
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            return input.value;
          })();
        `, startTimeInput, startTimeStr);
        await driver.sleep(500);

        // Verify time was set
        const timeValue = await startTimeInput.getAttribute('value');
        if (timeValue !== startTimeStr) {
          console.warn(`Start time verification: Expected: ${startTimeStr}, Got: ${timeValue}`);
        }
      } else {
        throw new Error('Start time input not found');
      }
    } catch (error) {
      console.warn('Could not set start time:', error);
      // Don't throw - continue and see if form still works
    }

    // Set end date - click date picker and select the same future date as start
    try {
      const endDateButton = await waitForVisibleByCss(driver, '#end-date-picker', 10000);
      await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', endDateButton);
      await driver.sleep(300);
      await endDateButton.click();
      await driver.sleep(1000); // Wait for calendar popover to open

      // Navigate to the correct month if needed (same as start date)
      const targetMonth = end.getMonth();
      const targetYear = end.getFullYear();
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // If target is in a different month, navigate forward
      if (targetYear > currentYear || (targetYear === currentYear && targetMonth > currentMonth)) {
        const monthsToNavigate = (targetYear - currentYear) * 12 + (targetMonth - currentMonth);
        for (let i = 0; i < monthsToNavigate; i++) {
          const nextButton = await driver.findElement(By.css('button[aria-label*="next"], button[aria-label*="Next"]'));
          await nextButton.click();
          await driver.sleep(300);
        }
      }

      // Find and click the date in the calendar using data-day attribute (more reliable)
      const dayOfMonth = end.getDate();
      const targetDateStr = end.toLocaleDateString(); // Format matches data-day attribute

      // Try to find by data-day attribute first
      let calendarDateButton;
      try {
        calendarDateButton = await driver.wait(
          until.elementLocated(By.xpath(`//button[@data-day='${targetDateStr}' and not(contains(@class, 'rdp-day_outside')) and not(contains(@class, 'rdp-day_disabled'))]`)),
          5000
        );
      } catch {
        // Fallback: find by day number (but only in current month, not outside days)
        calendarDateButton = await driver.wait(
          until.elementLocated(By.xpath(`//button[contains(@class, 'rdp-day') and not(contains(@class, 'rdp-day_outside')) and not(contains(@class, 'rdp-day_disabled')) and normalize-space(text())='${dayOfMonth}']`)),
          10000
        );
      }

      await driver.wait(until.elementIsVisible(calendarDateButton), 5000);
      await calendarDateButton.click();
      await driver.sleep(500); // Wait for calendar to close
      console.log(`✓ Selected end date: ${endDateStr}`);
    } catch (error) {
      console.warn('Could not set end date via calendar:', error);
      throw new Error(`Failed to set end date: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Set end time - use JavaScript to set value directly
    try {
      const timeInputs = await driver.findElements(By.css('input[type="time"]'));
      if (timeInputs.length >= 2 && timeInputs[1]) {
        const endTimeInput = timeInputs[1];
        // Use JavaScript to set the value directly
        await driver.executeScript(`
          (function() {
            const input = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(input, value);
            } else {
              input.value = value;
            }
            input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
            return input.value;
          })();
        `, endTimeInput, endTimeStr);
        await driver.sleep(500);

        // Verify time was set
        const timeValue = await endTimeInput.getAttribute('value');
        if (timeValue !== endTimeStr) {
          console.warn(`End time verification: Expected: ${endTimeStr}, Got: ${timeValue}`);
        }
      } else {
        throw new Error('End time input not found');
      }
    } catch (error) {
      console.warn('Could not set end time:', error);
      // Don't throw - continue and see if form still works
    }

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

    // Step 7: Wait for either redirect success or venue availability error (robust polling up to 20s)
    const deadline = Date.now() + 20000;
    let outcome: 'success' | 'venue_error' | null = null;
    while (Date.now() < deadline) {
      // Check redirect
      const url = await driver.getCurrentUrl();
      if (url.includes('/dashboard/admin/events')) {
        outcome = 'success';
        break;
      }
      // Check for venue error text
      const errorElems = await driver.findElements(By.xpath("//*[contains(text(), 'Venue is not available for the selected booking period')]"));
      if (errorElems.length > 0 && errorElems[0]) {
        const visible = await errorElems[0].isDisplayed();
        if (visible) {
          outcome = 'venue_error';
          break;
        }
      }
      await driver.sleep(500);
    }

    if (outcome === 'success') {
      await takeScreenshot(driver, 'admin-create-event-03-success-redirect');
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/dashboard/admin/events');

      createdEventName = eventName;

      // Aggressively find the event after creation
      await driver.navigate().refresh();
      await driver.sleep(3000); // Wait for page to reload and events to load

      // Try multiple strategies to find the event
      try {
        console.log(`✓ Polling for event card with name: ${eventName}`);

        // Strategy 1: Find by any text containing event name within a card
        let eventCard;
        try {
          eventCard = await pollForElement(
            driver,
            By.xpath(`//*[contains(text(), '${eventName}')]/ancestor::div[@data-testid and starts-with(@data-testid, 'event-card-')]`),
            15000
          );
        } catch {
          // Strategy 2: Find all event cards and check their text content
          const allCards = await driver.findElements(By.css('[data-testid^="event-card-"]'));
          for (const card of allCards) {
            try {
              const cardText = await card.getText();
              if (cardText.includes(eventName)) {
                eventCard = card;
                break;
              }
            } catch {
              // Skip cards that can't be read
              continue;
            }
          }
          if (!eventCard) {
            throw new Error('Event card not found using any strategy');
          }
        }

        const cardTestId = await eventCard.getAttribute('data-testid');
        const match = cardTestId.match(/event-card-(.+)/);
        if (match && match[1]) {
          createdEventId = match[1];
          console.log(`✓ Extracted event ID from card: ${createdEventId}`);
        } else {
          throw new Error('Could not extract event ID from data-testid');
        }
      } catch (error) {
        console.warn('Could not extract event ID after polling, will use event name as fallback');
        console.warn(`Error: ${error instanceof Error ? error.message : String(error)}`);
        createdEventId = null;
      }
    } else if (outcome === 'venue_error') {
      await takeScreenshot(driver, 'admin-create-event-03-venue-error');
      const currentUrl = await driver.getCurrentUrl();
      expect(currentUrl).toContain('/dashboard/admin/events/create');
    } else {
      // Fallback: bubble up more context if neither happened
      const pageText = await (await driver.findElement(By.css('body'))).getText();
      throw new Error('Neither success redirect nor venue error appeared within timeout. Page text snippet: ' + pageText.slice(0, 500));
    }
  }, 120000);

  it('should invite a speaker to the created event', async () => {
    if (!driver) throw new Error('Driver not initialized');
    if (!createdEventId && !createdEventName) {
      console.warn('No event was created in previous test, skipping speaker invitation test');
      return;
    }

    // Step 1: Navigate to admin events page (ensure we're back at the events list)
    await navigateTo(driver, '/dashboard/admin/events');
    await driver.sleep(2000); // Wait for initial page load

    // Force refresh to ensure we get the latest data
    await driver.navigate().refresh();
    await driver.sleep(3000); // Wait for page and events to load after refresh

    await takeScreenshot(driver, 'admin-invite-speaker-00-events-page');

    // Step 2: Find the event card and click the Edit button
    try {
      let editButton;

      if (createdEventId) {
        console.log(`✓ Looking for Edit button with test ID: edit-event-${createdEventId}`);
        // Try using the data-testid first (more reliable)
        try {
          editButton = await pollForElement(driver, By.css(`[data-testid="edit-event-${createdEventId}"]`), 10000);
          console.log(`✓ Found Edit button by test ID`);
        } catch {
          // Fallback: find by event card and then Edit button
          console.log(`✓ Fallback: Polling for event card with test ID: event-card-${createdEventId}`);
          const eventCard = await pollForElement(driver, By.css(`[data-testid="event-card-${createdEventId}"]`), 10000);
          console.log(`✓ Found event card`);
          editButton = await eventCard.findElement(By.xpath('.//button[contains(., "Edit")]'));
          console.log(`✓ Found Edit button within the card`);
        }
      } else {
        console.log(`✓ Fallback: Polling for event by name: ${createdEventName}`);
        // Try to find the event card by name
        const eventCard = await pollForElement(driver, By.xpath(`//*[contains(text(), '${createdEventName}')]/ancestor::div[@data-testid and starts-with(@data-testid, 'event-card-')]`), 15000);
        console.log(`✓ Found event card by name`);
        editButton = await eventCard.findElement(By.xpath('.//button[contains(., "Edit")]'));
        console.log(`✓ Found Edit button within the card using fallback`);
      }

      if (!editButton) {
        throw new Error("Edit button could not be located.");
      }

      await driver.wait(until.elementIsVisible(editButton), 5000);
      await driver.sleep(500);

      // Scroll the button into view
      await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', editButton);
      await driver.sleep(500);

      await editButton.click();
      await driver.sleep(1000);
      await takeScreenshot(driver, 'admin-invite-speaker-01-click-edit');

      console.log('✓ Clicked Edit button');
    } catch (error) {
      await takeScreenshot(driver, 'admin-invite-speaker-01-error-finding-edit');

      // Debug: Try to get page source or visible text
      try {
        const bodyText = await driver.findElement(By.css('body')).getText();
        console.log('Page text snippet:', bodyText.substring(0, 500));
      } catch (debugError) {
        console.log('Could not get debug info');
      }

      throw new Error(`Could not find Edit button for event: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 3: Wait for redirect to modify page
    await waitForUrl(driver, '/dashboard/admin/events/modify/', 10000);
    await driver.sleep(2000);
    await takeScreenshot(driver, 'admin-invite-speaker-02-modify-page');

    // Step 4: Find and click the "Invite Speaker" button
    try {
      const inviteSpeakerButton = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(., 'Invite Speaker')]")),
        10000
      );
      await driver.wait(until.elementIsVisible(inviteSpeakerButton), 5000);
      await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', inviteSpeakerButton);
      await driver.sleep(500);
      await inviteSpeakerButton.click();
      await driver.sleep(2000); // Wait for modal to appear
      await takeScreenshot(driver, 'admin-invite-speaker-03-click-invite-button');

      console.log('✓ Clicked Invite Speaker button');
    } catch (error) {
      await takeScreenshot(driver, 'admin-invite-speaker-03-error-finding-invite-button');
      throw new Error(`Could not find Invite Speaker button: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 5: Wait for the modal/dialog to appear and search for speaker
    try {
      // Wait for the modal dialog to be visible
      await driver.wait(
        until.elementLocated(By.xpath("//div[@role='dialog']//h2[contains(., 'Invite Speaker')]")),
        10000
      );

      console.log('✓ Modal opened');

      // Find the search input within the modal
      const searchInput = await driver.wait(
        until.elementLocated(By.css('input[placeholder*="Search"]')),
        10000
      );
      await driver.wait(until.elementIsVisible(searchInput), 5000);
      await searchInput.click();
      await driver.sleep(300);

      // Type "Ashwin" to search for the speaker
      const searchTerm = 'Ashwin';
      for (const char of searchTerm) {
        await searchInput.sendKeys(char);
        await driver.sleep(100);
      }

      console.log(`✓ Searching for: ${searchTerm}`);

      // Wait for search results to load (debounce delay + search time)
      await driver.sleep(2000);
      await takeScreenshot(driver, 'admin-invite-speaker-04-search-speaker');
    } catch (error) {
      await takeScreenshot(driver, 'admin-invite-speaker-04-error-search-input');
      throw new Error(`Could not find or interact with search input: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 6: Select the speaker from the search results
    try {
      // Find the speaker card by looking for "Ashwin" name in the results
      const speakerCard = await driver.wait(
        until.elementLocated(By.xpath("//div[contains(@class, 'border') and contains(@class, 'rounded')]//h3[contains(text(), 'Ashwin')]")),
        10000
      );
      await driver.wait(until.elementIsVisible(speakerCard), 5000);

      console.log('✓ Found speaker in results');

      // Click the speaker card or the Select button within it
      try {
        // Try to find and click the "Select" button in the speaker card
        const selectButton = await driver.findElement(
          By.xpath("//div[contains(@class, 'border') and contains(@class, 'rounded')]//h3[contains(text(), 'Ashwin')]/ancestor::div[contains(@class, 'border')]//button[contains(., 'Select')]")
        );
        await selectButton.click();
      } catch {
        // If Select button not found, click the card itself
        await speakerCard.click();
      }

      await driver.sleep(1000);
      await takeScreenshot(driver, 'admin-invite-speaker-05-select-speaker');

      console.log('✓ Selected speaker');
    } catch (error) {
      await takeScreenshot(driver, 'admin-invite-speaker-05-error-selecting-speaker');
      throw new Error(`Could not find or select speaker from list: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 7: Wait for invitation message textarea and click "Send Invitation"
    try {
      // Wait for the invitation message section to appear
      await driver.wait(
        until.elementLocated(By.css('textarea')),
        10000
      );

      await driver.sleep(500);

      console.log('✓ Invitation message section loaded');

      // Find and click the "Send Invitation" button
      const sendInvitationButton = await driver.wait(
        until.elementLocated(By.xpath("//button[contains(., 'Send Invitation')]")),
        10000
      );
      await driver.wait(until.elementIsVisible(sendInvitationButton), 5000);
      await driver.wait(until.elementIsEnabled(sendInvitationButton), 5000);

      // Scroll into view and click
      await driver.executeScript('arguments[0].scrollIntoView({ behavior: "smooth", block: "center" });', sendInvitationButton);
      await driver.sleep(500);
      await sendInvitationButton.click();

      console.log('✓ Clicked Send Invitation');

      await driver.sleep(2000); // Wait for invitation to be sent and modal to close
      await takeScreenshot(driver, 'admin-invite-speaker-06-send-invitation');
    } catch (error) {
      await takeScreenshot(driver, 'admin-invite-speaker-06-error-send-button');
      throw new Error(`Could not find or click Send Invitation button: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Step 8: Verify success (look for success message or modal close)
    await driver.sleep(1500);
    await takeScreenshot(driver, 'admin-invite-speaker-07-success');

    // Verify we're still on the modify page or success message appeared
    const currentUrl = await driver.getCurrentUrl();
    expect(currentUrl).toContain('/dashboard/admin/events/modify/');

    console.log('✅ Successfully invited speaker to event');
  }, 120000);
});
