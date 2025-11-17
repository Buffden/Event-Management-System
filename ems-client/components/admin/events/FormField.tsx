'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, required, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700 dark:text-slate-300">
        {label} {required && '*'}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
}

export function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  error
}: TextInputProps) {
  return (
    <FormField id={id} label={label} required={required} error={error}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={error ? 'border-red-500' : ''}
      />
    </FormField>
  );
}

interface TextAreaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  error?: string;
}

export function TextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
  error
}: TextAreaProps) {
  return (
    <FormField id={id} label={label} required={required} error={error}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
        }`}
      />
    </FormField>
  );
}

interface SelectProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  required?: boolean;
  error?: string;
  isLoading?: boolean;
  loadingText?: string;
}

export function Select({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required,
  error,
  isLoading,
  loadingText = 'Loading...'
}: SelectProps) {
  return (
    <FormField id={id} label={label} required={required} error={error}>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-slate-600 dark:text-slate-400">{loadingText}</span>
        </div>
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
          }`}
        >
          <option value={0}>{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
}

