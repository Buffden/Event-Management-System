'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, File, X, CheckCircle, AlertCircle, FileText, Presentation } from 'lucide-react';
import { useLogger } from '@/lib/logger/LoggerProvider';

const LOGGER_COMPONENT_NAME = 'MaterialUpload';

interface MaterialUploadProps {
  onUpload: (file: File, eventId?: string) => Promise<void>;
  eventId?: string;
  disabled?: boolean;
}

interface UploadFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function MaterialUpload({ onUpload, eventId, disabled = false }: MaterialUploadProps) {
  const logger = useLogger();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    logger.debug(LOGGER_COMPONENT_NAME, 'Files dropped', { count: acceptedFiles.length });
    
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file: file,
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [logger]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'application/vnd.oasis.opendocument.presentation': ['.odp'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: disabled || isUploading,
  });

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  const uploadFile = useCallback(async (file: UploadFile) => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === file.id && f.status === 'uploading') {
            const newProgress = Math.min(f.progress + Math.random() * 30, 90);
            return { ...f, progress: newProgress };
          }
          return f;
        }));
      }, 200);

      await onUpload(file.file, eventId);

      clearInterval(progressInterval);
      
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ));

      logger.info(LOGGER_COMPONENT_NAME, 'File uploaded successfully', { fileName: file.file.name });
    } catch (error) {
      setFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            }
          : f
      ));

      logger.error(LOGGER_COMPONENT_NAME, 'File upload failed', error as Error, { fileName: file.file.name });
    }
  }, [onUpload, eventId, logger]);

  const uploadAllFiles = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    
    try {
      await Promise.all(pendingFiles.map(uploadFile));
    } finally {
      setIsUploading(false);
    }
  }, [files, uploadFile]);

  const getFileIcon = (file: UploadFile) => {
    if (file.file.type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    if (file.file.type && file.file.type.includes('presentation')) return <Presentation className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Presentation Materials
        </CardTitle>
        <CardDescription>
          Upload PDF or PowerPoint files for your presentations. Maximum file size: 50MB
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            or click to select files
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports PDF, PPT, PPTX, ODP files
          </p>
        </div>

        {/* Upload Summary */}
        {files.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">{files.length} files</Badge>
            {pendingCount > 0 && <Badge variant="secondary">{pendingCount} pending</Badge>}
            {successCount > 0 && <Badge variant="default" className="bg-green-100 text-green-800">{successCount} uploaded</Badge>}
            {errorCount > 0 && <Badge variant="destructive">{errorCount} failed</Badge>}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                {getFileIcon(file)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.file.size)}
                  </p>
                  {file.status === 'uploading' && (
                    <div className="mt-1 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300 ease-out"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(file.status)}
                  {file.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeFile(file.id)}
                      disabled={isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {pendingCount > 0 && (
          <Button 
            onClick={uploadAllFiles} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`}
          </Button>
        )}

        {/* Success Message */}
        {successCount > 0 && pendingCount === 0 && errorCount === 0 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              All files uploaded successfully!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
