"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import TimeSelector from "./TimeSelector"
import { Clock, Calendar as CalendarIcon, ChevronDownIcon } from "lucide-react"

interface DateTimeSelectorProps {
  start: Date;
  end: Date;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  showTimeSelectors?: boolean;
}

export default function DateTimeSelector({
  start,
  end,
  setStartDate,
  setEndDate,
  showTimeSelectors = true
}: DateTimeSelectorProps) {

  const handleStartTimeChange = (newTime: Date) => {
    const newStart = new Date(start);
    newStart.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    setStartDate(newStart);
  }

  const handleEndTimeChange = (newTime: Date) => {
    const newEnd = new Date(end);
    newEnd.setHours(newTime.getHours(), newTime.getMinutes(), 0, 0);
    setEndDate(newEnd);
  }

  return (
    <div className="space-y-6">
      {/* Date and Time Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Start Date & Time */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Event Start
          </Label>

          <div className="flex gap-4">
            <div className="flex flex-col gap-3 flex-1">
              <Label htmlFor="start-date-picker" className="px-1 text-xs">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="start-date-picker"
                    className="w-full justify-between font-normal"
                  >
                    {start.toLocaleDateString()}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={start}
                    onSelect={(date) => {
                      if (date) {
                        const newStart = new Date(date)
                        newStart.setHours(start.getHours(), start.getMinutes(), 0, 0)
                        setStartDate(newStart)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {showTimeSelectors && (
              <div className="flex flex-col gap-3 flex-1">
                <Label htmlFor="start-time-picker" className="px-1 text-xs">
                  Time
                </Label>
                <TimeSelector
                  time={start}
                  setTime={handleStartTimeChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* End Date & Time */}
        <div className="space-y-4">
          <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Event End
          </Label>

          <div className="flex gap-4">
            <div className="flex flex-col gap-3 flex-1">
              <Label htmlFor="end-date-picker" className="px-1 text-xs">
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    id="end-date-picker"
                    className="w-full justify-between font-normal"
                  >
                    {end.toLocaleDateString()}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={end}
                    onSelect={(date) => {
                      if (date) {
                        const newEnd = new Date(date)
                        newEnd.setHours(end.getHours(), end.getMinutes(), 0, 0)
                        setEndDate(newEnd)
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {showTimeSelectors && (
              <div className="flex flex-col gap-3 flex-1">
                <Label htmlFor="end-time-picker" className="px-1 text-xs">
                  Time
                </Label>
                <TimeSelector
                  time={end}
                  setTime={handleEndTimeChange}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected DateTime Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Event Start
          </Label>
          <p className="text-sm text-slate-900 dark:text-white font-medium">
            {start.toLocaleDateString()} at {start.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>
        <div className="space-y-1">
          <Label className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Event End
          </Label>
          <p className="text-sm text-slate-900 dark:text-white font-medium">
            {end.toLocaleDateString()} at {end.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
