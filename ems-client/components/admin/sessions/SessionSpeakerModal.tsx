'use client';

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  SessionSpeakerAssignRequest,
  SessionSpeakerMaterialsStatus,
  SessionSpeakerUpdateRequest,
} from "@/lib/api/types/event.types";
import { adminApiClient } from "@/lib/api/admin.api";
import { SpeakerProfile } from "@/lib/api/speaker.api";
import { useLogger } from "@/lib/logger/LoggerProvider";

interface SessionSpeakerModalProps {
  isOpen: boolean;
  mode: "create" | "update";
  draft: Partial<SessionSpeakerAssignRequest & SessionSpeakerUpdateRequest>;
  onClose: () => void;
  onSubmit: (
    payload: SessionSpeakerAssignRequest | SessionSpeakerUpdateRequest,
    mode: "create" | "update"
  ) => Promise<void>;
  disabled?: boolean;
}

interface SpeakerFormState {
  speakerId: string;
  materialsStatus: SessionSpeakerMaterialsStatus;
  specialNotes: string;
}

const defaultState: SpeakerFormState = {
  speakerId: "",
  materialsStatus: SessionSpeakerMaterialsStatus.REQUESTED,
  specialNotes: "",
};

export function SessionSpeakerModal({
  isOpen,
  mode,
  draft,
  onClose,
  onSubmit,
  disabled,
}: SessionSpeakerModalProps) {
  const logger = useLogger();
  const [form, setForm] = useState<SpeakerFormState>(defaultState);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SpeakerProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerProfile | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm({
      speakerId: draft.speakerId ?? "",
      materialsStatus: draft.materialsStatus ?? SessionSpeakerMaterialsStatus.REQUESTED,
      specialNotes: draft.specialNotes ?? "",
    });

    if (mode === "create") {
      setSearchTerm("");
      setSearchResults([]);
      setSearchError(null);
      setSelectedSpeaker(null);
    } else if (draft.speakerId) {
      setSearchTerm("");
      setSearchResults([]);
      setSearchError(null);
      setSelectedSpeaker(null);
      adminApiClient
        .getSpeakerProfile(draft.speakerId)
        .then(setSelectedSpeaker)
        .catch((error) => logger.error("SessionSpeakerModal", "Failed to fetch speaker profile", error as Error));
    }
  }, [isOpen, draft, mode, logger]);

  useEffect(() => {
    if (!isOpen || mode !== "create") return;
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setSearchLoading(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await adminApiClient.searchSpeakers({ query: trimmed, limit: 5 });
        setSearchResults(results);
        setSearchError(results.length === 0 ? "No speakers found." : null);
      } catch (error) {
        logger.error("SessionSpeakerModal", "Speaker search failed", error as Error);
        setSearchError("Failed to search speakers.");
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, isOpen, mode, logger]);

  const isUpdate = useMemo(() => mode === "update", [mode]);

  const validate = () => {
    const validationErrors: Record<string, string> = {};
    if (!isUpdate && !form.speakerId.trim()) {
      validationErrors.speakerId = "Please select a speaker";
    }
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = (): SessionSpeakerAssignRequest | SessionSpeakerUpdateRequest => {
    if (isUpdate) {
      const payload: SessionSpeakerUpdateRequest = {
        materialsStatus: form.materialsStatus,
        specialNotes: form.specialNotes.trim() || null,
      };
      return payload;
    }

    const payload: SessionSpeakerAssignRequest = {
      speakerId: form.speakerId.trim(),
      materialsStatus: form.materialsStatus,
      specialNotes: form.specialNotes.trim() || undefined,
    };

    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitting(true);
      await onSubmit(buildPayload(), mode);
    } catch (error) {
      logger.error("SessionSpeakerModal", "Failed to submit speaker assignment", error as Error);
      const message = error instanceof Error ? error.message : "Failed to save speaker assignment.";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpeakerSelect = (speaker: SpeakerProfile) => {
    setSelectedSpeaker(speaker);
    setForm((prev) => ({ ...prev, speakerId: speaker.id }));
    setSearchTerm(speaker.name);
    setSearchResults([]);
    setSearchError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Assign speaker to session" : "Update speaker assignment"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Search for a speaker and assign them to this session."
              : "Update the materials status or notes for this speaker."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.general && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          {mode === "create" ? (
            <div className="space-y-2">
              <Label htmlFor="session-speaker-search">Speaker</Label>
              <Input
                id="session-speaker-search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setSelectedSpeaker(null);
                  setForm((prev) => ({ ...prev, speakerId: "" }));
                }}
                placeholder="Search by speaker name"
                disabled={disabled || submitting}
              />
              {searchLoading && (
                <p className="text-xs text-slate-500">Searching…</p>
              )}
              {searchError && !searchLoading && (
                <p className="text-xs text-red-600">{searchError}</p>
              )}
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  {searchResults.map((speaker) => (
                    <button
                      type="button"
                      key={speaker.id}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSpeakerSelect(speaker)}
                      disabled={disabled || submitting}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        {speaker.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{speaker.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{speaker.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {selectedSpeaker && (
                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{selectedSpeaker.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSpeaker.email}</p>
                </div>
              )}
              {errors.speakerId && <p className="text-sm text-red-600">{errors.speakerId}</p>}
            </div>
          ) : (
            selectedSpeaker && (
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2 text-sm">
                <p className="font-medium text-slate-900 dark:text-slate-100">{selectedSpeaker.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{selectedSpeaker.email}</p>
              </div>
            )
          )}

          <div className="space-y-2">
            <Label htmlFor="session-materials-status">Materials status</Label>
            <select
              id="session-materials-status"
              value={form.materialsStatus}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  materialsStatus: event.target.value as SessionSpeakerMaterialsStatus,
                }))
              }
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled || submitting}
            >
              {Object.values(SessionSpeakerMaterialsStatus).map((status) => (
                <option key={status} value={status}>
                  {status.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-speaker-notes">Special notes</Label>
            <Textarea
              id="session-speaker-notes"
              value={form.specialNotes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, specialNotes: event.target.value }))
              }
              placeholder="Share logistics, expectations, or reminders."
              rows={3}
              disabled={disabled || submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              disabled ||
              submitting ||
              (mode === "create" && !form.speakerId)
            }
          >
            {submitting ? "Saving..." : mode === "create" ? "Assign speaker" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
 

