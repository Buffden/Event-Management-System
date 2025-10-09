'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ILogger } from './LoggerInterface';
import { logger } from '../logger';

// Create logger context
const LoggerContext = createContext<ILogger | null>(null);

// Logger provider component
export function LoggerProvider({ children }: { children: ReactNode }) {
  return (
    <LoggerContext.Provider value={logger}>
      {children}
    </LoggerContext.Provider>
  );
}

// Hook to use logger
export function useLogger(): ILogger {
  const logger = useContext(LoggerContext);

  if (!logger) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  return logger;
}
