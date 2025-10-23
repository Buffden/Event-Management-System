// src/services/context.service.ts
import { v4 as uuidv4 } from 'uuid';

interface RequestContext {
  requestId: string;
  userId?: string;
  userRole?: string;
}

class ContextService {
  private context: RequestContext | null = null;

  setContext(context: RequestContext): void {
    this.context = context;
  }

  getContext(): RequestContext | null {
    return this.context;
  }

  getRequestId(): string {
    return this.context?.requestId || uuidv4();
  }

  clearContext(): void {
    this.context = null;
  }
}

export const contextService = new ContextService();
