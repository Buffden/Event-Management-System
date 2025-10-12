'use client';

import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  eventName?: string;
  isLoading?: boolean;
}

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  eventName,
  isLoading = false,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    // Validate rejection reason
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    if (rejectionReason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters long');
      return;
    }

    setError('');
    
    try {
      await onConfirm(rejectionReason);
      // Reset state on success
      setRejectionReason('');
      setError('');
    } catch (err) {
      setError('Failed to reject event. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setRejectionReason('');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mr-2" />
            Reject Event
          </DialogTitle>
          <DialogDescription>
            {eventName ? (
              <>You are about to reject the event: <strong>{eventName}</strong></>
            ) : (
              'You are about to reject this event'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Rejection Reason *
            </Label>
            <textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="Please provide a detailed reason for rejecting this event (minimum 10 characters)..."
              rows={4}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
                error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
              }`}
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {error}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {rejectionReason.length}/10 characters minimum
            </p>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> The speaker will be notified with this rejection reason and can resubmit the event after making necessary changes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading || rejectionReason.trim().length < 10}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Rejecting...
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Reject Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

