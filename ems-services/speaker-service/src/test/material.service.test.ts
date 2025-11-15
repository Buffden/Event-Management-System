/**
 * Comprehensive Test Suite for Material Service
 *
 * Tests all material management functionality including:
 * - Material upload
 * - Material retrieval
 * - Material download
 * - Material deletion
 * - File validation
 * - Statistics
 */

import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import {
  mockPrisma,
  mockLogger,
  createMockSpeakerProfile,
  createMockMaterial,
  resetAllMocks,
} from './mocks-simple';
import { MaterialService } from '../services/material.service';

// Mock fs/promises
var mockFs: any;

jest.mock('fs', () => {
  mockFs = {
    mkdir: jest.fn(),
    access: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    unlink: jest.fn(),
  };
  return {
    promises: mockFs,
  };
});

describe('MaterialService', () => {
  let materialService: MaterialService;

  beforeEach(() => {
    resetAllMocks();
    jest.clearAllMocks();
    materialService = new MaterialService();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('test file content'));
    mockFs.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('constructor()', () => {
    it('should create MaterialService with default upload directory', () => {
      expect(materialService).toBeDefined();
    });

    it('should use environment variable for upload directory', () => {
      const originalUploadDir = process.env.UPLOAD_DIR;
      process.env.UPLOAD_DIR = '/custom/uploads';
      const service = new MaterialService();
      expect(service).toBeDefined();
      if (originalUploadDir) {
        process.env.UPLOAD_DIR = originalUploadDir;
      }
    });
  });

  describe('uploadMaterial()', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024000,
      buffer: Buffer.from('test content'),
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('should upload material successfully', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const mockMaterial = createMockMaterial();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.presentationMaterial.create.mockResolvedValue(mockMaterial);

      const result = await materialService.uploadMaterial(mockFile, {
        speakerId: 'speaker-123',
        eventId: 'event-123',
        fileName: 'test.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
      });

      expect(mockPrisma.speakerProfile.findUnique).toHaveBeenCalledWith({
        where: { id: 'speaker-123' },
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockPrisma.presentationMaterial.create).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should throw error for invalid file type', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);

      await expect(
        materialService.uploadMaterial(mockFile, {
          speakerId: 'speaker-123',
          fileName: 'test.txt',
          fileSize: 1024,
          mimeType: 'text/plain',
        })
      ).rejects.toThrow('Invalid file type');
    });

    it('should throw error for file too large', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);

      await expect(
        materialService.uploadMaterial(mockFile, {
          speakerId: 'speaker-123',
          fileName: 'test.pdf',
          fileSize: 60 * 1024 * 1024, // 60MB
          mimeType: 'application/pdf',
        })
      ).rejects.toThrow('File size too large');
    });

    it('should throw error if speaker not found', async () => {
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(null);

      await expect(
        materialService.uploadMaterial(mockFile, {
          speakerId: 'non-existent',
          fileName: 'test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
        })
      ).rejects.toThrow('Speaker not found');
    });

    it('should handle optional eventId', async () => {
      const mockSpeaker = createMockSpeakerProfile();
      const mockMaterial = createMockMaterial({ eventId: null });
      mockPrisma.speakerProfile.findUnique.mockResolvedValue(mockSpeaker);
      mockPrisma.presentationMaterial.create.mockResolvedValue(mockMaterial);

      await materialService.uploadMaterial(mockFile, {
        speakerId: 'speaker-123',
        fileName: 'test.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      });

      expect(mockPrisma.presentationMaterial.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: null,
        }),
      });
    });
  });

  describe('getMaterialById()', () => {
    it('should retrieve material by ID', async () => {
      const mockMaterial = createMockMaterial();
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);

      const result = await materialService.getMaterialById('material-123');

      expect(mockPrisma.presentationMaterial.findUnique).toHaveBeenCalledWith({
        where: { id: 'material-123' },
      });
      expect(result).toEqual(mockMaterial);
    });

    it('should return null if material not found', async () => {
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(null);

      const result = await materialService.getMaterialById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getSpeakerMaterials()', () => {
    it('should retrieve all materials for a speaker', async () => {
      const mockMaterials = [createMockMaterial()];
      mockPrisma.presentationMaterial.findMany.mockResolvedValue(mockMaterials);

      const result = await materialService.getSpeakerMaterials('speaker-123');

      expect(mockPrisma.presentationMaterial.findMany).toHaveBeenCalledWith({
        where: { speakerId: 'speaker-123' },
        orderBy: { uploadDate: 'desc' },
      });
      expect(result).toEqual(mockMaterials);
    });
  });

  describe('getEventMaterials()', () => {
    it('should retrieve all materials for an event', async () => {
      const mockMaterials = [createMockMaterial()];
      mockPrisma.presentationMaterial.findMany.mockResolvedValue(mockMaterials);

      const result = await materialService.getEventMaterials('event-123');

      expect(mockPrisma.presentationMaterial.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-123' },
        orderBy: { uploadDate: 'desc' },
      });
      expect(result).toEqual(mockMaterials);
    });
  });

  describe('getSpeakerEventMaterials()', () => {
    it('should retrieve materials for speaker and event', async () => {
      const mockMaterials = [createMockMaterial()];
      mockPrisma.presentationMaterial.findMany.mockResolvedValue(mockMaterials);

      const result = await materialService.getSpeakerEventMaterials('speaker-123', 'event-123');

      expect(mockPrisma.presentationMaterial.findMany).toHaveBeenCalledWith({
        where: {
          speakerId: 'speaker-123',
          eventId: 'event-123',
        },
        orderBy: { uploadDate: 'desc' },
      });
      expect(result).toEqual(mockMaterials);
    });
  });

  describe('downloadMaterial()', () => {
    it('should download material successfully', async () => {
      const mockMaterial = createMockMaterial();
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(Buffer.from('file content'));

      const result = await materialService.downloadMaterial('material-123');

      expect(mockPrisma.presentationMaterial.findUnique).toHaveBeenCalledWith({
        where: { id: 'material-123' },
      });
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result.material).toEqual(mockMaterial);
      expect(result.fileBuffer).toBeInstanceOf(Buffer);
    });

    it('should throw error if material not found', async () => {
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(null);

      await expect(materialService.downloadMaterial('non-existent')).rejects.toThrow(
        'Material not found'
      );
    });

    it('should throw error if file not found on disk', async () => {
      const mockMaterial = createMockMaterial();
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);
      mockFs.access.mockRejectedValue(new Error('File not found'));

      await expect(materialService.downloadMaterial('material-123')).rejects.toThrow(
        'Material file not found on disk'
      );
    });

    it('should handle relative file paths', async () => {
      const mockMaterial = createMockMaterial({ filePath: 'relative/path/test.pdf' });
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);
      mockFs.access.mockRejectedValueOnce(new Error('Not found'));
      mockFs.access.mockResolvedValueOnce(undefined);
      mockFs.readFile.mockResolvedValue(Buffer.from('content'));

      const result = await materialService.downloadMaterial('material-123');

      expect(result.material).toEqual(mockMaterial);
    });
  });

  describe('deleteMaterial()', () => {
    it('should delete material successfully', async () => {
      const mockMaterial = createMockMaterial();
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);
      mockPrisma.presentationMaterial.delete.mockResolvedValue(mockMaterial);

      await materialService.deleteMaterial('material-123');

      expect(mockPrisma.presentationMaterial.findUnique).toHaveBeenCalledWith({
        where: { id: 'material-123' },
      });
      expect(mockFs.unlink).toHaveBeenCalledWith(mockMaterial.filePath);
      expect(mockPrisma.presentationMaterial.delete).toHaveBeenCalledWith({
        where: { id: 'material-123' },
      });
    });

    it('should throw error if material not found', async () => {
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(null);

      await expect(materialService.deleteMaterial('non-existent')).rejects.toThrow(
        'Material not found'
      );
    });

    it('should handle file deletion errors gracefully', async () => {
      const mockMaterial = createMockMaterial();
      mockPrisma.presentationMaterial.findUnique.mockResolvedValue(mockMaterial);
      mockFs.unlink.mockRejectedValue(new Error('File not found'));
      mockPrisma.presentationMaterial.delete.mockResolvedValue(mockMaterial);

      await materialService.deleteMaterial('material-123');

      expect(mockPrisma.presentationMaterial.delete).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('updateMaterial()', () => {
    it('should update material metadata', async () => {
      const updatedMaterial = createMockMaterial({ fileName: 'updated.pdf' });
      mockPrisma.presentationMaterial.update.mockResolvedValue(updatedMaterial);

      const result = await materialService.updateMaterial('material-123', {
        fileName: 'updated.pdf',
      });

      expect(mockPrisma.presentationMaterial.update).toHaveBeenCalledWith({
        where: { id: 'material-123' },
        data: { fileName: 'updated.pdf' },
      });
      expect(result).toEqual(updatedMaterial);
    });

    it('should update eventId', async () => {
      const updatedMaterial = createMockMaterial({ eventId: 'new-event-123' });
      mockPrisma.presentationMaterial.update.mockResolvedValue(updatedMaterial);

      const result = await materialService.updateMaterial('material-123', {
        eventId: 'new-event-123',
      });

      expect(result.eventId).toBe('new-event-123');
    });
  });

  describe('getSpeakerMaterialStats()', () => {
    it('should calculate material statistics', async () => {
      const mockMaterials = [
        createMockMaterial({ fileSize: 1000, mimeType: 'application/pdf' }),
        createMockMaterial({ fileSize: 2000, mimeType: 'application/pdf' }),
        createMockMaterial({ fileSize: 1500, mimeType: 'application/vnd.ms-powerpoint' }),
      ];
      mockPrisma.presentationMaterial.findMany.mockResolvedValue(mockMaterials);

      const result = await materialService.getSpeakerMaterialStats('speaker-123');

      expect(result.totalMaterials).toBe(3);
      expect(result.totalSize).toBe(4500);
      expect(result.materialsByType['application/pdf']).toBe(2);
      expect(result.materialsByType['application/vnd.ms-powerpoint']).toBe(1);
    });
  });

  describe('validateFile()', () => {
    it('should validate PDF file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const result = materialService.validateFile(mockFile);

      expect(result.valid).toBe(true);
    });

    it('should validate PowerPoint file', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pptx',
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const result = materialService.validateFile(mockFile);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid file type', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 1024,
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const result = materialService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject file too large', () => {
      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 60 * 1024 * 1024, // 60MB
        buffer: Buffer.from('test'),
        destination: '',
        filename: '',
        path: '',
        stream: null as any,
      };

      const result = materialService.validateFile(mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size too large');
    });
  });
});

