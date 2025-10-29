'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useLogger } from '@/lib/logger/LoggerProvider';
import { attendanceApiClient } from '@/lib/api/attendance.api';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Save,
  Clock
} from 'lucide-react';

const LOGGER_COMPONENT_NAME = 'SpeakerMaterialSelection';

interface SpeakerMaterialSelectionProps {
  invitationId: string;
  eventId: string;
  eventName: string;
  eventStartTime: string;
  onMaterialsUpdated?: () => void;
}

export function SpeakerMaterialSelection({ 
  invitationId, 
  eventId, 
  eventName, 
  eventStartTime,
  onMaterialsUpdated 
}: SpeakerMaterialSelectionProps) {
  const logger = useLogger();
  const [materialsData, setMaterialsData] = useState<any>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [canEditMaterials, setCanEditMaterials] = useState(true);

  useEffect(() => {
    loadMaterialsData();
  }, [invitationId]);

  // Check if materials can be edited (before event starts)
  useEffect(() => {
    const now = new Date();
    const eventStart = new Date(eventStartTime);
    setCanEditMaterials(now < eventStart);
  }, [eventStartTime]);

  const loadMaterialsData = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await attendanceApiClient.getAvailableMaterials(invitationId);
      setMaterialsData(data);
      setSelectedMaterials(data.selectedMaterials);

      logger.info(LOGGER_COMPONENT_NAME, 'Materials data loaded successfully', { 
        invitationId, 
        availableCount: data.availableMaterials.length,
        selectedCount: data.selectedMaterials.length
      });

    } catch (error) {
      setError('Failed to load materials');
      logger.error(LOGGER_COMPONENT_NAME, 'Error loading materials data', error as Error, { invitationId });
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialToggle = (materialId: string) => {
    if (!canEditMaterials) return;

    setSelectedMaterials(prev => 
      prev.includes(materialId) 
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleSaveMaterials = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      const result = await attendanceApiClient.updateMaterialsForEvent(invitationId, selectedMaterials);
      
      if (result.success) {
        setSuccessMessage(result.message);
        logger.info(LOGGER_COMPONENT_NAME, 'Materials updated successfully', { 
          invitationId, 
          selectedCount: selectedMaterials.length 
        });
        
        if (onMaterialsUpdated) {
          onMaterialsUpdated();
        }
      } else {
        setError(result.message);
        logger.warn(LOGGER_COMPONENT_NAME, 'Failed to update materials', { 
          invitationId, 
          message: result.message 
        });
      }
    } catch (error) {
      setError('Failed to save materials. Please try again.');
      logger.error(LOGGER_COMPONENT_NAME, 'Error saving materials', error as Error, { invitationId });
    } finally {
      setSaving(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading materials...</p>
        </CardContent>
      </Card>
    );
  }

  if (error && !materialsData) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadMaterialsData} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Material Selection
        </CardTitle>
        <CardDescription>
          Select materials to include in "{eventName}"
        </CardDescription>
        {!canEditMaterials && (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Materials locked - event started
          </Badge>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Available Materials */}
        {materialsData && materialsData.availableMaterials.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">
              Available Materials ({materialsData.availableMaterials.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {materialsData.availableMaterials.map((material: any) => (
                <div 
                  key={material.id} 
                  className={`flex items-center space-x-3 p-3 border rounded-lg ${
                    selectedMaterials.includes(material.id) ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <Checkbox
                    id={material.id}
                    checked={selectedMaterials.includes(material.id)}
                    onCheckedChange={() => handleMaterialToggle(material.id)}
                    disabled={!canEditMaterials}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <label 
                        htmlFor={material.id} 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {material.fileName}
                      </label>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(material.fileSize)} • {material.mimeType} • Uploaded {formatDate(material.uploadDate)}
                    </div>
                  </div>
                  {selectedMaterials.includes(material.id) && (
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No materials available</p>
            <p className="text-gray-400 text-xs">Upload materials first to select them for events</p>
          </div>
        )}

        {/* Selection Summary */}
        {materialsData && materialsData.availableMaterials.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Selected Materials:</span>
              <Badge variant="outline">
                {selectedMaterials.length} of {materialsData.availableMaterials.length}
              </Badge>
            </div>
          </div>
        )}

        {/* Save Button */}
        {materialsData && materialsData.availableMaterials.length > 0 && canEditMaterials && (
          <Button
            onClick={handleSaveMaterials}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Selection
              </>
            )}
          </Button>
        )}

        {/* Status Messages */}
        {successMessage && (
          <div className="text-sm p-2 rounded bg-green-100 text-green-800 border border-green-200">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="text-sm p-2 rounded bg-red-100 text-red-800 border border-red-200">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
