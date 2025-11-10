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
import { CreateSessionRequest, UpdateSessionRequest } from "@/lib/api/types/event.types";
import { useLogger } from "@/lib/logger/LoggerProvider";

interface SessionFormModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  sessionDraft: Partial<CreateSessionRequest & UpdateSessionRequest>;
  onClose: () => void;
  onSubmit: (payload: CreateSessionRequest | UpdateSessionRequest) => Promise<void>;
  disabled?: boolean;
}

interface SessionFormState {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  stage: string;
}

const initialState: SessionFormState = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  stage: "",
};

const toDateTimeLocal = (iso: string | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
};

export function SessionFormModal({
  isOpen,
  mode,
  sessionDraft,
  onClose,
  onSubmit,
  disabled,
}: SessionFormModalProps) {
  const logger = useLogger();
  const [form, setForm] = useState<SessionFormState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setForm({
      title: sessionDraft.title ?? "",
      description: sessionDraft.description ?? "",
      startsAt: toDateTimeLocal(sessionDraft.startsAt),
      endsAt: toDateTimeLocal(sessionDraft.endsAt),
      stage: sessionDraft.stage ?? "",
    });
  }, [isOpen, sessionDraft]);

  const isEdit = useMemo(() => mode === "edit", [mode]);

  const validate = (): boolean => {
    const validationErrors: Record<string, string> = {};
    if (!form.title.trim()) validationErrors.title = "Title is required";
    if (!form.startsAt) validationErrors.startsAt = "Start time is required";
    if (!form.endsAt) validationErrors.endsAt = "End time is required";

    if (form.startsAt && form.endsAt) {
      const start = new Date(form.startsAt);
      const end = new Date(form.endsAt);
      if (start >= end) validationErrors.endsAt = "End time must be after start time";
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const buildPayload = (): CreateSessionRequest | UpdateSessionRequest => {
    const toIso = (value: string): string | undefined => {
      if (!value) return undefined;
      const iso = new Date(value).toISOString();
      return iso;
    };

    if (isEdit) {
      const payload: UpdateSessionRequest = {};
      if (form.title !== sessionDraft.title) payload.title = form.title.trim();
      if (form.description !== (sessionDraft.description ?? "")) payload.description = form.description.trim() || undefined;
      if (form.stage !== (sessionDraft.stage ?? "")) payload.stage = form.stage.trim() || undefined;

      const newStart = toIso(form.startsAt);
      if (newStart && newStart !== sessionDraft.startsAt) payload.startsAt = newStart;

      const newEnd = toIso(form.endsAt);
      if (newEnd && newEnd !== sessionDraft.endsAt) payload.endsAt = newEnd;

      return payload;
    }

    const payload: CreateSessionRequest = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsAt: toIso(form.startsAt)!,
      endsAt: toIso(form.endsAt)!,
      stage: form.stage.trim() || undefined,
    };

    return payload;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      logger.warn("SessionFormModal", "Validation failed", { errors });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(buildPayload());
    } catch (error) {
      logger.error("SessionFormModal", "Failed to submit session", error as Error);
      const message = error instanceof Error ? error.message : "Failed to save session.";
      setErrors((prev) => ({ ...prev, general: message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit session" : "Create session"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the session details below." : "Define the details of the new session."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.general && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errors.general}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="session-title">Title</Label>
            <Input
              id="session-title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Session title"
              disabled={disabled || submitting}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-description">Description</Label>
            <Textarea
              id="session-description"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Optional details about the session"
              rows={4}
              disabled={disabled || submitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-startsAt">Starts at</Label>
              <Input
                id="session-startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
                disabled={disabled || submitting}
              />
              {errors.startsAt && <p className="text-sm text-red-600">{errors.startsAt}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="session-endsAt">Ends at</Label>
              <Input
                id="session-endsAt"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm((prev) => ({ ...prev, endsAt: event.target.value }))}
                disabled={disabled || submitting}
              />
              {errors.endsAt && <p className="text-sm text-red-600">{errors.endsAt}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="session-stage">Stage / Room</Label>
            <Input
              id="session-stage"
              value={form.stage}
              onChange={(event) => setForm((prev) => ({ ...prev, stage: event.target.value }))}
              placeholder="Optional: Stage, room, or track name"
              disabled={disabled || submitting}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={disabled || submitting}>
            {submitting ? "Saving..." : isEdit ? "Save changes" : "Create session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

