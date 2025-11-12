/**
 * Basic Test Setup for Speaker Service
 *
 * This file verifies that the test environment is properly configured.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import {
  mockPrisma,
  mockLogger,
  mockJWT,
  mockAxios,
  createMockSpeakerProfile,
  createMockInvitation,
  createMockMaterial,
  createMockUser,
  createMockMessage,
} from './mocks-simple';

describe('Basic Test Setup', () => {
  it('should have Jest globals available', () => {
    expect(expect).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(beforeAll).toBeDefined();
    expect(afterAll).toBeDefined();
    expect(beforeEach).toBeDefined();
    expect(afterEach).toBeDefined();
    expect(jest).toBeDefined();
  });

  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('should have required environment variables', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.RABBITMQ_URL).toBeDefined();
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.PORT).toBeDefined();
  });

  it('should be able to create mock objects', () => {
    const mockSpeaker = createMockSpeakerProfile();
    const mockInvitation = createMockInvitation();
    const mockMaterial = createMockMaterial();
    const mockUser = createMockUser();
    const mockMessage = createMockMessage();

    expect(mockSpeaker).toBeDefined();
    expect(mockSpeaker.id).toBe('speaker-123');
    expect(mockSpeaker.email).toBe('speaker@example.com');

    expect(mockInvitation).toBeDefined();
    expect(mockInvitation.speakerId).toBe('speaker-123');

    expect(mockMaterial).toBeDefined();
    expect(mockMaterial.speakerId).toBe('speaker-123');

    expect(mockUser).toBeDefined();
    expect(mockUser.id).toBe('user-123');

    expect(mockMessage).toBeDefined();
    expect(mockMessage.id).toBe('msg-123');
  });

  it('should have mocks properly initialized', () => {
    expect(mockPrisma).toBeDefined();
    expect(mockPrisma.speakerProfile).toBeDefined();
    expect(mockPrisma.speakerInvitation).toBeDefined();
    expect(mockPrisma.presentationMaterial).toBeDefined();
    expect(mockLogger).toBeDefined();
    expect(mockJWT).toBeDefined();
    expect(mockAxios).toBeDefined();
  });
});

