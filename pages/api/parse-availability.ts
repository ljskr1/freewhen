import { NextApiRequest, NextApiResponse } from 'next'
import { parseTimeToDate, findOverlappingSlots, formatTime } from '../../lib/timeUtils'

type ParsedAvailabilityResponse = {
  day?: string
  userATimeSlots: { start: string; end: string }[]
  friendBTimeSlots: { start: string; end: string }[]
  commonFreeSlots: { start: string; end: string }[]
  rawText: string
}

interface AvailabilitySlot {
  start: Date
  end: Date
}

// Enhanced natural language patterns
const TIME_PATTERNS = [
  // "9 AM to 5 PM", "9:30 AM - 5:30 PM"
  /(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|-|until|through)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi,
  // "free from 9 AM to 5 PM"
  /(?:free|available|open)\s+(?:from|between)?\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|-|until|through)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi,
  // "work 9 AM to 5 PM", "busy 9 AM to 5 PM"
  /(?:work|busy|occupied|meeting|class)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*(?:to|-|until|through)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/gi,
  // "9-5", "9:30-5:30"
  /(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)/gi
]

const DAY_PATTERNS = [
  // "tomorrow", "today"
  /(today|tomorrow)/gi,
  // "Monday", "Tuesday", etc.
  /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
  // "next Monday", "this Friday"
  /(?:next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi
]

// Temporary in-memory store for user availabilities
const userAvailabilities: { [key: string]: AvailabilitySlot[] } = {}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParsedAvailabilityResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { message } = req.body

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // Parse the message
    const parsedData = parseNaturalLanguage(message)
    
    if (!parsedData.day || parsedData.timeSlots.length === 0) {
      return res.status(400).json({ 
        error: 'Could not understand the time or date. Please try phrases like "I am free tomorrow from 9 AM to 5 PM"' 
      })
    }

    // Assume current date for parsing. In a real app, this would come from the calendar selection.
    const today = new Date()
    const userTimeZone = 'Australia/Melbourne' // This will be dynamic later

    // Convert parsed time slots to Date objects
    const extractedTimeSlots: AvailabilitySlot[] = []
    for (const slot of parsedData.timeSlots) {
      try {
        const start = parseTimeToDate(slot.start, today, userTimeZone)
        const end = parseTimeToDate(slot.end, today, userTimeZone)
        extractedTimeSlots.push({ start, end })
      } catch (e) {
        console.error('Error parsing time:', e)
      }
    }

    // For simplicity, let's assume this is the availability for 'User A'
    userAvailabilities['userA'] = extractedTimeSlots

    // Placeholder for 'User B' (your friend in Toronto)
    // In a real app, this would come from User B's saved availability
    const friendTimeZone = 'America/Toronto'
    const friendAvailability: AvailabilitySlot[] = [
      // Example: Friend is free on the same 'day' from 9 AM to 5 PM Toronto time
      {
        start: parseTimeToDate('9 AM', today, friendTimeZone),
        end: parseTimeToDate('5 PM', today, friendTimeZone),
      },
    ]
    userAvailabilities['userB'] = friendAvailability

    // Calculate overlaps if both users have availability
    let commonFreeSlots: AvailabilitySlot[] = []
    if (userAvailabilities['userA'] && userAvailabilities['userB']) {
      commonFreeSlots = findOverlappingSlots(
        userAvailabilities['userA'],
        userAvailabilities['userB']
      )
    }

    const responseData: ParsedAvailabilityResponse = {
      day: parsedData.day,
      userATimeSlots: extractedTimeSlots.map(slot => ({
        start: formatTime(slot.start, userTimeZone),
        end: formatTime(slot.end, userTimeZone),
      })),
      friendBTimeSlots: friendAvailability.map(slot => ({
        start: formatTime(slot.start, friendTimeZone),
        end: formatTime(slot.end, friendTimeZone),
      })),
      commonFreeSlots: commonFreeSlots.map(slot => ({
        start: formatTime(slot.start, userTimeZone), // Display in user's timezone
        end: formatTime(slot.end, userTimeZone),
      })),
      rawText: message,
    }

    console.log('Processed Data:', responseData)
    res.status(200).json(responseData)

  } catch (error) {
    console.error('Error processing message:', error)
    res.status(500).json({ 
      error: 'Failed to process your message. Please try rephrasing.' 
    })
  }
}

function parseNaturalLanguage(message: string) {
  const lowerMessage = message.toLowerCase()
  let day: string | undefined
  const timeSlots: { start: string; end: string }[] = []

  // Extract day
  for (const pattern of DAY_PATTERNS) {
    const match = pattern.exec(lowerMessage)
    if (match) {
      day = match[1] || match[0]
      break
    }
  }

  // Extract time slots
  for (const pattern of TIME_PATTERNS) {
    let match
    while ((match = pattern.exec(lowerMessage)) !== null) {
      const start = match[1]
      const end = match[2]
      
      // Handle cases where end time doesn't have AM/PM
      let endTime = end
      if (start.includes('AM') || start.includes('PM')) {
        if (!end.includes('AM') && !end.includes('PM')) {
          // If start is PM and end is earlier, assume PM
          const startHour = parseInt(start.match(/(\d+)/)?.[1] || '0')
          const endHour = parseInt(end.match(/(\d+)/)?.[1] || '0')
          if (start.includes('PM') && endHour < startHour) {
            endTime = end + ' PM'
          } else if (start.includes('AM') && endHour < startHour) {
            endTime = end + ' AM'
          } else {
            endTime = end + (start.includes('PM') ? ' PM' : ' AM')
          }
        }
      }
      
      timeSlots.push({ start, end: endTime })
    }
  }

  return { day, timeSlots }
}
