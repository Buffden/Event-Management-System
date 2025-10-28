import { prisma } from '../database';
import { logger } from '../utils/logger';
import { promises as fs } from 'fs';
import path from 'path';
import {
  PresentationMaterial,
  UploadMaterialRequest
} from '../types';

export class MaterialService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env['UPLOAD_DIR'] || './uploads';
    this.ensureUploadDir();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating upload directory', error as Error);
    }
  }

  /**
   * Upload presentation material
   */
  async uploadMaterial(
    file: Express.Multer.File,
    data: UploadMaterialRequest
  ): Promise<PresentationMaterial> {
    try {
      logger.info('Uploading material', { 
        speakerId: data.speakerId,
        fileName: data.fileName,
        fileSize: data.fileSize
      });

      // Validate file type
      const allowedMimeTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.presentation'
      ];

      if (!allowedMimeTypes.includes(data.mimeType)) {
        throw new Error('Invalid file type. Only PDF and PowerPoint files are allowed.');
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (data.fileSize > maxSize) {
        throw new Error('File size too large. Maximum size is 50MB.');
      }

      // Check if speaker exists
      const speaker = await prisma.speakerProfile.findUnique({
        where: { id: data.speakerId }
      });

      if (!speaker) {
        throw new Error('Speaker not found');
      }

      // Generate unique filename
      const fileExtension = path.extname(data.fileName);
      const baseName = path.basename(data.fileName, fileExtension);
      const uniqueFileName = `${baseName}_${Date.now()}${fileExtension}`;
      const filePath = path.join(this.uploadDir, uniqueFileName);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Create database record
      const material = await prisma.presentationMaterial.create({
        data: {
          speakerId: data.speakerId,
          eventId: data.eventId || null,
          fileName: data.fileName,
          filePath: filePath,
          fileSize: data.fileSize,
          mimeType: data.mimeType
        }
      });

      logger.info('Material uploaded successfully', { 
        materialId: material.id,
        speakerId: data.speakerId,
        fileName: data.fileName
      });

      return material;
    } catch (error) {
      logger.error('Error uploading material', error as Error);
      throw error;
    }
  }

  /**
   * Get material by ID
   */
  async getMaterialById(id: string): Promise<PresentationMaterial | null> {
    try {
      logger.debug('Retrieving material', { materialId: id });

      const material = await prisma.presentationMaterial.findUnique({
        where: { id }
      });

      return material;
    } catch (error) {
      logger.error('Error retrieving material', error as Error);
      throw error;
    }
  }

  /**
   * Get materials for a speaker
   */
  async getSpeakerMaterials(speakerId: string): Promise<PresentationMaterial[]> {
    try {
      logger.debug('Retrieving speaker materials', { speakerId });

      const materials = await prisma.presentationMaterial.findMany({
        where: { speakerId },
        orderBy: {
          uploadDate: 'desc'
        }
      });

      return materials;
    } catch (error) {
      logger.error('Error retrieving speaker materials', error as Error);
      throw error;
    }
  }

  /**
   * Get materials for an event
   */
  async getEventMaterials(eventId: string): Promise<PresentationMaterial[]> {
    try {
      logger.debug('Retrieving event materials', { eventId });

      const materials = await prisma.presentationMaterial.findMany({
        where: { eventId },
        orderBy: {
          uploadDate: 'desc'
        }
      });

      return materials;
    } catch (error) {
      logger.error('Error retrieving event materials', error as Error);
      throw error;
    }
  }

  /**
   * Get materials for a speaker and event
   */
  async getSpeakerEventMaterials(speakerId: string, eventId: string): Promise<PresentationMaterial[]> {
    try {
      logger.debug('Retrieving speaker event materials', { speakerId, eventId });

      const materials = await prisma.presentationMaterial.findMany({
        where: {
          speakerId,
          eventId
        },
        orderBy: {
          uploadDate: 'desc'
        }
      });

      return materials;
    } catch (error) {
      logger.error('Error retrieving speaker event materials', error as Error);
      throw error;
    }
  }

  /**
   * Download material file
   */
  async downloadMaterial(id: string): Promise<{ material: PresentationMaterial; fileBuffer: Buffer }> {
    try {
      logger.info('Downloading material', { materialId: id });

      const material = await prisma.presentationMaterial.findUnique({
        where: { id }
      });

      if (!material) {
        throw new Error('Material not found');
      }

      // Check if file exists on disk
      try {
        await fs.access(material.filePath);
      } catch {
        throw new Error('Material file not found on disk');
      }

      const fileBuffer = await fs.readFile(material.filePath);

      logger.info('Material downloaded successfully', { materialId: id });
      return { material, fileBuffer };
    } catch (error) {
      logger.error('Error downloading material', error as Error);
      throw error;
    }
  }

  /**
   * Delete material
   */
  async deleteMaterial(id: string): Promise<void> {
    try {
      logger.info('Deleting material', { materialId: id });

      const material = await prisma.presentationMaterial.findUnique({
        where: { id }
      });

      if (!material) {
        throw new Error('Material not found');
      }

      // Delete file from disk
      try {
        await fs.unlink(material.filePath);
      } catch (error) {
        logger.warn('Error deleting file from disk', { error: error as Error, filePath: material.filePath });
      }

      // Delete database record
      await prisma.presentationMaterial.delete({
        where: { id }
      });

      logger.info('Material deleted successfully', { materialId: id });
    } catch (error) {
      logger.error('Error deleting material', error as Error);
      throw error;
    }
  }

  /**
   * Update material metadata
   */
  async updateMaterial(id: string, updates: { fileName?: string; eventId?: string }): Promise<PresentationMaterial> {
    try {
      logger.info('Updating material', { materialId: id });

      const material = await prisma.presentationMaterial.update({
        where: { id },
        data: updates
      });

      logger.info('Material updated successfully', { materialId: id });
      return material;
    } catch (error) {
      logger.error('Error updating material', error as Error);
      throw error;
    }
  }

  /**
   * Get material statistics for a speaker
   */
  async getSpeakerMaterialStats(speakerId: string): Promise<{
    totalMaterials: number;
    totalSize: number;
    materialsByType: { [mimeType: string]: number };
  }> {
    try {
      logger.debug('Retrieving speaker material stats', { speakerId });

      const materials = await prisma.presentationMaterial.findMany({
        where: { speakerId }
      });

      const totalMaterials = materials.length;
      const totalSize = materials.reduce((sum, material) => sum + material.fileSize, 0);
      
      const materialsByType: { [mimeType: string]: number } = {};
      materials.forEach(material => {
        materialsByType[material.mimeType] = (materialsByType[material.mimeType] || 0) + 1;
      });

      return {
        totalMaterials,
        totalSize,
        materialsByType
      };
    } catch (error) {
      logger.error('Error retrieving speaker material stats', error as Error);
      throw error;
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.oasis.opendocument.presentation'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only PDF and PowerPoint files are allowed.'
      };
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size too large. Maximum size is 50MB.'
      };
    }

    return { valid: true };
  }
}
