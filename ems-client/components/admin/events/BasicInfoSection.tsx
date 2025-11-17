'use client';

import { Calendar } from 'lucide-react';
import { TextInput, TextArea } from './FormField';

interface BasicInfoSectionProps {
  name: string;
  category: string;
  description: string;
  bannerImageUrl: string;
  errors: Record<string, string>;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onBannerImageUrlChange: (value: string) => void;
}

export function BasicInfoSection({
  name,
  category,
  description,
  bannerImageUrl,
  errors,
  onNameChange,
  onCategoryChange,
  onDescriptionChange,
  onBannerImageUrlChange
}: BasicInfoSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
        <Calendar className="h-5 w-5 mr-2" />
        Basic Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextInput
          id="name"
          label="Event Name"
          value={name}
          onChange={onNameChange}
          placeholder="Enter event name"
          required
          error={errors.name}
        />

        <TextInput
          id="category"
          label="Category"
          value={category}
          onChange={onCategoryChange}
          placeholder="e.g., Technology, Business, Education"
          required
          error={errors.category}
        />
      </div>

      <TextArea
        id="description"
        label="Description"
        value={description}
        onChange={onDescriptionChange}
        placeholder="Describe your event in detail..."
        required
        error={errors.description}
      />

      <TextInput
        id="bannerImageUrl"
        label="Banner Image URL"
        value={bannerImageUrl}
        onChange={onBannerImageUrlChange}
        placeholder="https://example.com/image.jpg"
        type="url"
      />
    </div>
  );
}

