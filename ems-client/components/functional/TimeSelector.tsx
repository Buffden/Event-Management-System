"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Clock } from "lucide-react"

interface TimeSelectorProps {
  time: Date;
  setTime: (time: Date) => void;
  label?: string;
  disabled?: boolean;
}

export default function TimeSelector({ time, setTime, label, disabled = false }: TimeSelectorProps) {
  // Format time for input (HH:MM)
  const formatTimeForInput = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Parse time from input (HH:MM)
  const parseTimeFromInput = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return { hours, minutes }
  }

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return

    const timeString = event.target.value
    if (timeString) {
      const { hours, minutes } = parseTimeFromInput(timeString)
      const newTime = new Date(time)
      newTime.setHours(hours, minutes, 0, 0)
      setTime(newTime)
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          {label}
        </Label>
      )}

      <Input
        type="time"
        value={formatTimeForInput(time)}
        onChange={handleTimeChange}
        disabled={disabled}
        className="w-full bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
      />
    </div>
  )
}
