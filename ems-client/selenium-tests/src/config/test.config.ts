/**
 * Test configuration for Selenium tests
 */

export interface TimeoutConfig {
  implicit: number;
  pageLoad: number;
  script: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface BrowserConfig {
  name: string;
  headless: boolean;
  windowSize: WindowSize;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface CredentialsConfig {
  validUser: UserCredentials;
  invalidUser: UserCredentials;
}

export interface ScreenshotConfig {
  enabled: boolean;
  directory: string;
}

export interface TestConfig {
  baseUrl: string;
  timeouts: TimeoutConfig;
  browser: BrowserConfig;
  credentials: CredentialsConfig;
  screenshots: ScreenshotConfig;
}

const config: TestConfig = {
  // Base URL for the application
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost',

  // Timeout settings (in milliseconds)
  timeouts: {
    implicit: 10000,      // Implicit wait timeout
    pageLoad: 30000,      // Page load timeout
    script: 30000         // Script timeout
  },

  // Browser configuration
  browser: {
    name: process.env.TEST_BROWSER || 'chrome', // chrome, firefox, edge
    headless: process.env.HEADLESS === 'true' || false,
    windowSize: {
      width: 1920,
      height: 1080
    }
  },

  // Test credentials (should be set via environment variables in production)
  credentials: {
    validUser: {
      email: process.env.TEST_USER_EMAIL || 'admin@eventmanagement.com',
      password: process.env.TEST_USER_PASSWORD || 'Admin123!'
    },
    invalidUser: {
      email: 'invalid@test.com',
      password: 'wrongpassword'
    }
  },

  // Screenshot settings
  screenshots: {
    enabled: process.env.TAKE_SCREENSHOTS === 'true' || false,
    directory: './selenium-tests/screenshots'
  }
};

export default config;

