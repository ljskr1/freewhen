import { format } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

interface TimeSlot {
  start: Date
  end: Date
}

/**
 * Converts a time string (e.g., "9 AM", "14:30") to a Date object relative to a base date
 * and in a specific time zone.
 * @param timeString The time string to parse.
 * @param baseDate The base date to attach the time to.
 * @param timeZone The IANA time zone (e.g., 'America/Toronto', 'Australia/Melbourne').
 * @returns A Date object with the correct time and time zone.
 */
export function parseTimeToDate(
  timeString: string,
  baseDate: Date,
  timeZone: string
): Date {
  // This is a simplified parser. For production, consider a more robust solution
  // that handles various formats and implied AM/PM.
  let hour = 0
  let minute = 0

  const ampmMatch = timeString.match(/(\d+)(?::(\d{2}))?\s*(AM|PM)/i)
  if (ampmMatch) {
    hour = parseInt(ampmMatch[1], 10)
    minute = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0
    const ampm = ampmMatch[3].toLowerCase()

    if (ampm === 'pm' && hour < 12) hour += 12
    if (ampm === 'am' && hour === 12) hour = 0 // 12 AM is 00:00
  } else {
    const militaryMatch = timeString.match(/(\d{1,2})(?::(\d{2}))?/)
    if (militaryMatch) {
      hour = parseInt(militaryMatch[1], 10)
      minute = militaryMatch[2] ? parseInt(militaryMatch[2], 10) : 0
    }
  }

  const dateWithTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hour, minute, 0, 0);
  return toZonedTime(dateWithTime, timeZone);
}

/**
 * Converts a time slot from a source time zone to a target time zone.
 * @param slot The time slot to convert.
 * @param fromTimeZone The source IANA time zone.
 * @param toTimeZone The target IANA time zone.
 * @returns The converted time slot.
 */
export function convertTimeSlotTimeZone(
  slot: TimeSlot,
  fromTimeZone: string,
  toTimeZone: string
): TimeSlot {
  const startInTargetZone = toZonedTime(fromZonedTime(slot.start, fromTimeZone), toTimeZone)
  const endInTargetZone = toZonedTime(fromZonedTime(slot.end, fromTimeZone), toTimeZone)
  return { start: startInTargetZone, end: endInTargetZone }
}

/**
 * Finds overlapping time slots between two sets of availability.
 * @param slots1 First set of time slots.
 * @param slots2 Second set of time slots.
 * @returns An array of overlapping time slots.
 */
export function findOverlappingSlots(
  slots1: TimeSlot[],
  slots2: TimeSlot[]
): TimeSlot[] {
  const overlaps: TimeSlot[] = []

  for (const s1 of slots1) {
    for (const s2 of slots2) {
      const overlapStart = new Date(Math.max(s1.start.getTime(), s2.start.getTime()))
      const overlapEnd = new Date(Math.min(s1.end.getTime(), s2.end.getTime()))

      if (overlapStart < overlapEnd) {
        overlaps.push({ start: overlapStart, end: overlapEnd })
      }
    }
  }
  return overlaps
}

// Helper to format Date objects for display (e.g., 'HH:mm')
export function formatTime(date: Date, timeZone: string): string {
  return format(toZonedTime(date, timeZone), 'HH:mm')
}
