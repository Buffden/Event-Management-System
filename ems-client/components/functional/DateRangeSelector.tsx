"use client"

import * as React from "react"
import { type DateRange } from "react-day-picker"

import { Calendar } from "@/components/ui/calendar"

interface DateRangeSelectorProps {
    start: Date;
    end: Date;
    setStartDate: (date: Date) => void;
    setEndDate: (date: Date) => void;
}

export default function DateRangeSelector(props: DateRangeSelectorProps) {
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: props.start,
        to: props.end,
    });

    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);
        if (range?.from) {
            props.setStartDate(range.from);
        }
        if (range?.to) {
            props.setEndDate(range.to);
        }
    }

    return (
        <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleDateRangeChange}
            numberOfMonths={2}
            className="rounded-lg border shadow-sm"
        />
    )
}
