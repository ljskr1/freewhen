import { NextApiRequest, NextApiResponse } from 'next'
import { parseTimeToDate, findOverlappingSlots, formatTime } from '../../lib/timeUtils'
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { addDays, nextDay, setDay, startOfWeek, endOfWeek, format } from 'date-fns'
import { broadcastSheetUpdate } from './sheet-updates/[id]';

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

interface SheetAvailabilities {
  [userName: string]: AvailabilitySlot[]
}

const sheetAvailabilities: { [sheetId: string]: SheetAvailabilities } = {}

// AI-powered natural language parsing
async function parseWithAI(message: string, userTimeZone: string) {
  const currentDate = new Date()
  const formattedDate = format(currentDate, 'yyyy-MM-dd')
  const dayOfWeek = format(currentDate, 'EEEE')
  
  const prompt = `You are a scheduling assistant. Parse this availability message and extract time slots.

Current date: ${formattedDate} (${dayOfWeek})
User timezone: ${userTimeZone}
User message: "${message}"

Extract availability as JSON with this exact format:
{
  "slots": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "type": "free"
    }
  ]
}

Rules:
- Convert relative dates (today, tomorrow, Monday, etc.) to actual dates
- Use 24-hour format for times
- If user says "I don't have work" or similar, assume 8:00-22:00 availability
- Handle exclusions like "except 12-1pm" by creating separate slots
- If no specific date mentioned, assume today
- Only return the JSON, no other text

Examples:
"I'm free tomorrow 9am to 5pm" → date: tomorrow's date, times: 09:00-17:00
"I don't have work Monday" → date: next Monday, times: 08:00-22:00
"Free today 9-12 and 2-6" → two slots for today: 09:00-12:00 and 14:00-18:00`

  try {
    // Try Gemini API first
    if (process.env.GEMINI_API_KEY) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return parseAIResponse(text, userTimeZone)
      }
    }
    
    // Fallback to Hugging Face if Gemini fails
    if (process.env.HUGGINGFACE_API_KEY) {
      const response = await fetch('https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_length: 500, temperature: 0.1 }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        return parseAIResponse(data.generated_text || '', userTimeZone)
      }
    }
    
    // Fallback to enhanced regex if AI fails
    return parseNaturalLanguage(message, userTimeZone)
    
  } catch (error) {
    console.error('AI parsing failed, using fallback:', error)
    return parseNaturalLanguage(message, userTimeZone)
  }
}

function parseAIResponse(aiText: string, userTimeZone: string) {
  try {
    // Extract JSON from AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    
    const parsed = JSON.parse(jsonMatch[0])
    const slots: AvailabilitySlot[] = []
    
    if (parsed.slots && Array.isArray(parsed.slots)) {
      for (const slot of parsed.slots) {
        if (slot.date && slot.startTime && slot.endTime) {
          const baseDate = new Date(slot.date)
          const start = parseTimeToDate(slot.startTime, baseDate, userTimeZone)
          const end = parseTimeToDate(slot.endTime, baseDate, userTimeZone)
          slots.push({ start, end })
        }
      }
    }
    
    return { day: 'parsed', slots }
  } catch (error) {
    console.error('Failed to parse AI response:', error)
    throw error
  }
}

// Enhanced NLP: supports multiple slots, relative dates, exclusions, and timezone
function parseNaturalLanguage(message: string, userTimeZone: string) {
  const lowerMessage = message.toLowerCase()
  let day: string | undefined
  let baseDate = new Date()
  const slots: AvailabilitySlot[] = []
  const exclusions: { start: string; end: string }[] = []

  // 1. Detect relative days (today, tomorrow, this weekend, next Monday, etc.)
  if (/tomorrow/.test(lowerMessage)) {
    baseDate = addDays(baseDate, 1)
    day = 'tomorrow'
  } else if (/today/.test(lowerMessage)) {
    day = 'today'
  } else if (/this weekend/.test(lowerMessage)) {
    const sat = setDay(startOfWeek(baseDate, { weekStartsOn: 1 }), 6)
    const sun = setDay(startOfWeek(baseDate, { weekStartsOn: 1 }), 0)
    day = 'this weekend'
  } else {
    // Check for explicit weekdays ("next Monday", "this Friday")
    const weekdayMatch = lowerMessage.match(/(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)
    if (weekdayMatch) {
      const weekday = weekdayMatch[2] || weekdayMatch[1]
      const weekdayNum = [
        'sunday','monday','tuesday','wednesday','thursday','friday','saturday'
      ].indexOf(weekday!)
      if (weekdayMatch[1] === 'next') {
        baseDate = nextDay(baseDate, weekdayNum)
        day = `next ${weekday}`
      } else {
        baseDate = setDay(startOfWeek(baseDate, { weekStartsOn: 1 }), weekdayNum)
        day = `this ${weekday}`
      }
    }
  }

  // 2. Extract all time slots (free/busy)
  const freeRegex = /(?:free|available|open)\s*(?:from|between)?\s*([\d:apm ]+)\s*(?:to|-|until|through)\s*([\d:apm ]+)/gi
  let match
  while ((match = freeRegex.exec(lowerMessage)) !== null) {
    slots.push({
      start: parseTimeToDate(match[1].trim(), baseDate, userTimeZone),
      end: parseTimeToDate(match[2].trim(), baseDate, userTimeZone),
    })
  }
  
  // Busy/exclusion slots
  const busyRegex = /(?:work|busy|occupied|meeting|class|except|but not)\s*([\d:apm ]+)\s*(?:to|-|until|through)\s*([\d:apm ]+)/gi
  while ((match = busyRegex.exec(lowerMessage)) !== null) {
    exclusions.push({ start: match[1].trim(), end: match[2].trim() })
  }

  // 3. If no explicit free slots, but message says "I don't have work ...", treat as free all day except busy slots
  if (slots.length === 0 && /i don'?t have work|i am free|no work/.test(lowerMessage)) {
    slots.push({
      start: parseTimeToDate('8 AM', baseDate, userTimeZone),
      end: parseTimeToDate('10 PM', baseDate, userTimeZone),
    })
  }

  // 4. Remove exclusions from free slots
  if (exclusions.length > 0 && slots.length > 0) {
    exclusions.forEach(ex => {
      const exStart = parseTimeToDate(ex.start, baseDate, userTimeZone)
      const exEnd = parseTimeToDate(ex.end, baseDate, userTimeZone)
      for (let i = slots.length - 1; i >= 0; i--) {
        const slot = slots[i]
        if (exStart < slot.end && exEnd > slot.start) {
          slots.splice(i, 1)
          if (exStart > slot.start) {
            slots.push({ start: slot.start, end: exStart })
          }
          if (exEnd < slot.end) {
            slots.push({ start: exEnd, end: slot.end })
          }
        }
      }
    })
  }

  // 5. Sort slots
  slots.sort((a, b) => a.start.getTime() - b.start.getTime())

  return { day, slots }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { message, timezone, sheetId, userName, remove, availability } = req.body
  const userTimeZone = timezone || 'Australia/Melbourne'
  const sheetKey = sheetId || 'default'
  const name = userName || 'Anonymous'

  // Handle creating a sheet with existing availability
  if (availability && Array.isArray(availability)) {
    if (!sheetAvailabilities[sheetKey]) sheetAvailabilities[sheetKey] = {};
    sheetAvailabilities[sheetKey][name] = availability.map((slot: any) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));

    const allUsers = Object.entries(sheetAvailabilities[sheetKey]);
    const allUserSlots = allUsers.map(([user, slots]) => ({
      user,
      slots: slots.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }))
    }));

    const response = { users: allUserSlots, overlap: [], sheetId: sheetKey };
    broadcastSheetUpdate(sheetKey, response);
    return res.status(200).json(response);
  }

  // Handle empty message (fetch only)
  if (!message && !remove) {
    const allUsers = Object.entries(sheetAvailabilities[sheetKey] || {})
    const allUserSlots = allUsers.map(([user, slots]) => ({
      user,
      slots: slots.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }))
    }))
    
    let overlap: AvailabilitySlot[] = []
    if (allUsers.length > 1) {
      overlap = allUsers.map(([_, slots]) => slots).reduce((acc, slots) => findOverlappingSlots(acc, slots))
    }
    
    return res.status(200).json({
      users: allUserSlots,
      overlap: overlap.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() })),
      sheetId: sheetKey
    })
  }

  if (remove && userName && sheetAvailabilities[sheetKey]) {
    delete sheetAvailabilities[sheetKey][userName];
    const allUsers = Object.entries(sheetAvailabilities[sheetKey]);
    const allUserSlots = allUsers.map(([user, slots]) => ({
      user,
      slots: slots.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }))
    }));
    let overlap: AvailabilitySlot[] = [];
    if (allUsers.length > 1) {
      overlap = allUsers.map(([_, slots]) => slots).reduce((acc, slots) => findOverlappingSlots(acc, slots));
    }
    const response = {
      users: allUserSlots,
      overlap: overlap.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() })),
      rawText: message,
      sheetId: sheetKey
    };
    broadcastSheetUpdate(sheetKey, response);
    return res.status(200).json(response);
  }

  if (!message) {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // Use AI-powered parsing
    const parsedData = await parseWithAI(message, userTimeZone)
    
    if (!parsedData.slots || parsedData.slots.length === 0) {
      return res.status(400).json({ 
        error: 'Could not understand the time or date. Please try phrases like "I am free tomorrow from 9 AM to 5 PM"' 
      })
    }

    // Store in-memory by sheet and user
    if (!sheetAvailabilities[sheetKey]) sheetAvailabilities[sheetKey] = {}
    sheetAvailabilities[sheetKey][name] = parsedData.slots

    // Gather all users' availabilities for this sheet
    const allUsers = Object.entries(sheetAvailabilities[sheetKey])
    const allUserSlots = allUsers.map(([user, slots]) => ({
      user,
      slots: slots.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() }))
    }))

    // Find overlap (across all users)
    let overlap: AvailabilitySlot[] = []
    if (allUsers.length > 1) {
      overlap = allUsers.map(([_, slots]) => slots).reduce((acc, slots) => findOverlappingSlots(acc, slots))
    }

    const response = {
      users: allUserSlots,
      overlap: overlap.map(slot => ({ start: slot.start.toISOString(), end: slot.end.toISOString() })),
      rawText: message,
      sheetId: sheetKey
    }

    // Broadcast update to SSE subscribers
    broadcastSheetUpdate(sheetKey, response)

    res.status(200).json(response)
  } catch (error) {
    console.error('Error processing message:', error)
    res.status(500).json({ 
      error: 'Failed to process your message. Please try rephrasing.' 
    })
  }
}
