import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'

const calendar = google.calendar('v3')

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { action, accessToken, timeSlots, timezone } = req.body

    try {
      const auth = new google.auth.OAuth2()
      auth.setCredentials({ access_token: accessToken })

      switch (action) {
        case 'import':
          // Import events from Google Calendar
          const response = await calendar.events.list({
            auth,
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next 7 days
            singleEvents: true,
            orderBy: 'startTime',
          })

          const events = response.data.items?.map(event => ({
            id: event.id,
            title: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            type: 'busy'
          })) || []

          return res.status(200).json({ events })

        case 'export':
          // Export FreeWhen availability to Google Calendar
          const createdEvents = []
          
          for (const slot of timeSlots) {
            const event = {
              summary: 'Available - FreeWhen',
              description: 'Availability added via FreeWhen app',
              start: {
                dateTime: slot.start,
                timeZone: timezone,
              },
              end: {
                dateTime: slot.end,
                timeZone: timezone,
              },
              colorId: '10', // Green color
            }

            const createdEvent = await calendar.events.insert({
              auth,
              calendarId: 'primary',
              requestBody: event,
            })

            createdEvents.push(createdEvent.data)
          }

          return res.status(200).json({ 
            message: `Created ${createdEvents.length} events`,
            events: createdEvents 
          })

        case 'create-meeting':
          // Create a meeting event
          const { title, startTime, endTime, attendees, meetingType } = req.body
          
          let conferenceData = undefined
          if (meetingType === 'google-meet') {
            conferenceData = {
              createRequest: {
                requestId: `freewhen-${Date.now()}`,
                conferenceSolutionKey: {
                  type: 'hangoutsMeet'
                }
              }
            }
          }

          const meetingEvent = {
            summary: title || 'FreeWhen Meeting',
            description: 'Meeting scheduled via FreeWhen',
            start: {
              dateTime: startTime,
              timeZone: timezone,
            },
            end: {
              dateTime: endTime,
              timeZone: timezone,
            },
            attendees: attendees?.map((email: string) => ({ email })) || [],
            conferenceData,
            reminders: {
              useDefault: false,
              overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 10 },
              ],
            },
          }

          const meeting = await calendar.events.insert({
            auth,
            calendarId: 'primary',
            requestBody: meetingEvent,
            conferenceDataVersion: meetingType === 'google-meet' ? 1 : 0,
          })

          return res.status(200).json({
            message: 'Meeting created successfully',
            event: meeting.data,
            meetingLink: meeting.data.hangoutLink || meeting.data.htmlLink
          })

        default:
          return res.status(400).json({ error: 'Invalid action' })
      }
    } catch (error) {
      console.error('Calendar API error:', error)
      return res.status(500).json({ 
        error: 'Failed to sync with calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
