// Logger interface for dependency injection
export interface ILogger {
  debug(component: string, message: string, data?: any): void;
  info(component: string, message: string, data?: any): void;
  warn(component: string, message: string, data?: any): void;
  error(component: string, message: string, error?: Error, data?: any): void;
  userAction(component: string, action: string, data?: any): void;
  apiCall(component: string, method: string, url: string, body?: any): void;
  apiResponse(component: string, method: string, url: string, status: number, data?: any): void;
  errorWithContext(component: string, message: string, error: Error, context?: any): void;
  authEvent(component: string, message: string, data?: any): void;
}
