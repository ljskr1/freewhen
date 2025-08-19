import React, { useState } from 'react';
import { Calendar, Video, Mail, Download, Upload, ExternalLink } from 'lucide-react';

interface CalendarSyncProps {
  timezone: string;
  availability: any[];
  onEventsImported: (events: any[]) => void;
  onNotification: (message: string) => void;
}

const CalendarSync: React.FC<CalendarSyncProps> = ({ 
  timezone, 
  availability, 
  onEventsImported, 
  onNotification 
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Google OAuth setup
  const connectGoogleCalendar = async () => {
    setLoading(true);
    try {
      // Initialize Google OAuth
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        onNotification('Google Calendar integration not configured');
        return;
      }

      const scope = 'https://www.googleapis.com/auth/calendar';
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `access_type=offline&` +
        `prompt=consent`;

      // Open popup for OAuth
      const popup = window.open(authUrl, 'google-auth', 'width=500,height=600');
      
      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check if we got the token from localStorage (set by callback page)
          const token = localStorage.getItem('google_access_token');
          if (token) {
            setAccessToken(token);
            setIsConnected(true);
            onNotification('Google Calendar connected successfully!');
            localStorage.removeItem('google_access_token'); // Clean up
          }
          setLoading(false);
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth error:', error);
      onNotification('Failed to connect to Google Calendar');
      setLoading(false);
    }
  };

  // Import events from Google Calendar
  const importCalendarEvents = async () => {
    if (!accessToken) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import',
          accessToken,
          timezone
        })
      });

      const data = await response.json();
      if (response.ok) {
        onEventsImported(data.events);
        onNotification(`Imported ${data.events.length} events from Google Calendar`);
      } else {
        onNotification(data.error || 'Failed to import calendar events');
      }
    } catch (error) {
      onNotification('Failed to import calendar events');
    } finally {
      setLoading(false);
    }
  };

  // Export availability to Google Calendar
  const exportToCalendar = async () => {
    if (!accessToken || availability.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          accessToken,
          timeSlots: availability,
          timezone
        })
      });

      const data = await response.json();
      if (response.ok) {
        onNotification(data.message);
      } else {
        onNotification(data.error || 'Failed to export to calendar');
      }
    } catch (error) {
      onNotification('Failed to export to calendar');
    } finally {
      setLoading(false);
    }
  };

  // Create meeting with overlap times
  const createMeeting = async (overlapSlot: any) => {
    if (!accessToken) return;

    const title = prompt('Meeting title:') || 'FreeWhen Meeting';
    const attendeesInput = prompt('Attendee emails (comma-separated):') || '';
    const attendees = attendeesInput.split(',').map(email => email.trim()).filter(Boolean);

    setLoading(true);
    try {
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-meeting',
          accessToken,
          title,
          startTime: overlapSlot.start,
          endTime: overlapSlot.end,
          attendees,
          meetingType: 'google-meet',
          timezone
        })
      });

      const data = await response.json();
      if (response.ok) {
        onNotification('Meeting created successfully!');
        if (data.meetingLink) {
          // Open meeting link
          window.open(data.meetingLink, '_blank');
        }
      } else {
        onNotification(data.error || 'Failed to create meeting');
      }
    } catch (error) {
      onNotification('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">Calendar Integration</h3>
      </div>

      {!isConnected ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-blue-400" />
          </div>
          <h4 className="font-semibold mb-2">Connect Your Calendar</h4>
          <p className="text-gray-400 text-sm mb-4">
            Sync with Google Calendar to import your existing events and export your availability
          </p>
          <button
            onClick={connectGoogleCalendar}
            disabled={loading}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ExternalLink className="w-4 h-4" />
            )}
            Connect Google Calendar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            Google Calendar connected
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={importCalendarEvents}
              disabled={loading}
              className="btn-secondary flex items-center gap-2 justify-center"
            >
              <Download className="w-4 h-4" />
              Import Events
            </button>
            
            <button
              onClick={exportToCalendar}
              disabled={loading || availability.length === 0}
              className="btn-secondary flex items-center gap-2 justify-center"
            >
              <Upload className="w-4 h-4" />
              Export Availability
            </button>
          </div>

          {/* Meeting creation for overlap times */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Video className="w-4 h-4 text-green-400" />
              Quick Meeting
            </h4>
            <p className="text-sm text-gray-400 mb-3">
              Create Google Meet meetings for overlapping free times
            </p>
            
            {availability.filter(slot => slot.type === 'overlap').length > 0 ? (
              <div className="space-y-2">
                {availability
                  .filter(slot => slot.type === 'overlap')
                  .slice(0, 3)
                  .map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => createMeeting(slot)}
                      disabled={loading}
                      className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(slot.start).toLocaleDateString()} 
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(slot.start).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })} - {new Date(slot.end).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <Video className="w-4 h-4 text-green-400" />
                    </button>
                  ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                No overlapping times available for meetings
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarSync;
