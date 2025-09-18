  'use client'

import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Send, Users, Plus, Trash2, Share2, Calendar as CalendarIcon, Download, Link as LinkIcon } from 'lucide-react';
import Calendar from '../components/Calendar';
import { useRouter } from 'next/navigation';

interface Event {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
  type: 'free' | 'busy';
  user: string;
}

const TimezoneScheduler = () => {
  const router = useRouter();
  const [userTimezone, setUserTimezone] = useState('Australia/Melbourne');
  const [availability, setAvailability] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Auto-detect user timezone
  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setUserTimezone(detectedTimezone);
  }, []);

  // Show notification helper
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleExport = () => {
    if (availability.length === 0) {
      showNotification('No availability to export.');
      return;
    }

    const formatICSDate = (date: Date) => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return (
        date.getUTCFullYear().toString() +
        pad(date.getUTCMonth() + 1) +
        pad(date.getUTCDate()) +
        'T' +
        pad(date.getUTCHours()) +
        pad(date.getUTCMinutes()) +
        pad(date.getUTCSeconds()) +
        'Z'
      );
    };

    let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FreeWhen//EN\n';
    
    availability.forEach((event: any, index) => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      icsContent += 'BEGIN:VEVENT\n';
      icsContent += `UID:freewhen-${index}-${start.getTime()}@freewhen.app\n`;
      icsContent += `DTSTAMP:${formatICSDate(new Date())}\n`;
      icsContent += `DTSTART:${formatICSDate(start)}\n`;
      icsContent += `DTEND:${formatICSDate(end)}\n`;
      icsContent += `SUMMARY:Free Time - FreeWhen\n`;
      icsContent += `DESCRIPTION:Available time slot created with FreeWhen\n`;
      icsContent += 'END:VEVENT\n';
    });
    
    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'freewhen-availability.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Calendar exported successfully!');
  };

  // Fetch parsed availability from API
  const handleInputSubmit = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/parse-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputText, timezone: userTimezone }),
      });
      const data = await res.json();
      if (res.ok && data.users) {
        // Convert API response to Calendar events
        const events = data.users.flatMap((user: any) =>
          user.slots.map((slot: any) => ({
            start: slot.start,
            end: slot.end,
            type: 'free',
            user: user.user,
          }))
        );
        setAvailability(events);
        setInputText('');
        showNotification('Availability added successfully!');
      } else {
        setError(data.error || 'Could not parse input.');
      }
    } catch (e) {
      setError('Failed to connect to API.');
    } finally {
      setLoading(false);
    }
  };

  // Generate a random sheet ID and redirect
  const handleCreateSheet = async () => {
    setLoading(true);
    const id = Math.random().toString(36).slice(2, 10);
    try {
      const res = await fetch('/api/parse-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availability: availability, // Pass current availability
          sheetId: id,
          userName: 'Host',
        }),
      });
      if (res.ok) {
        router.push(`/sheet/${id}`);
      } else {
        const data = await res.json();
        setError(data.error || 'Could not create sheet.');
      }
    } catch (e) {
      setError('Failed to connect to API.');
    } finally {
      setLoading(false);
    }
  };

  // Share current availability
  const handleShare = async () => {
    if (navigator.share && availability.length > 0) {
      try {
        await navigator.share({
          title: 'FreeWhen - My Availability',
          text: 'Check out my availability on FreeWhen!',
          url: window.location.href,
        });
      } catch (err) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      showNotification('Link copied to clipboard!');
    }
  };

  const timezones = [
    'Australia/Melbourne',
    'America/Toronto',
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Singapore',
    'Pacific/Auckland',
    'America/Chicago'
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                FreeWhen
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Timezone Selector */}
              <div className="relative">
                <select
                  value={userTimezone}
                  onChange={(e) => setUserTimezone(e.target.value)}
                  className="input appearance-none pl-4 pr-10 py-2 text-sm min-w-[140px] bg-surface-elevated border-border hover:border-border-light focus:border-primary transition-all duration-200"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz} className="bg-surface-elevated text-foreground">
                      {tz.split('/')[1]?.replace('_', ' ') || tz}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-tertiary" />
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="btn btn-secondary flex items-center gap-2 px-4 py-2 text-sm font-medium"
                disabled={availability.length === 0}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>

              {/* Share Dropdown */}
              <div className="relative group">
                <button className="btn btn-accent flex items-center gap-2 px-4 py-2 text-sm font-medium">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute top-full right-0 mt-2 w-56 bg-surface-elevated rounded-2xl shadow-2xl border border-border-light opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 z-50">
                  <div className="p-2">
                    <button
                      onClick={handleCreateSheet}
                      disabled={loading}
                      className="w-full text-left px-4 py-3 text-sm rounded-xl hover:bg-surface-hover transition-colors duration-200 flex items-center gap-3 group/item"
                    >
                      <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center group-hover/item:bg-accent/20 transition-colors">
                        <Plus className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Create Shared Sheet</div>
                        <div className="text-xs text-foreground-tertiary">Start a new collaborative schedule</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleShare}
                      disabled={availability.length === 0}
                      className="w-full text-left px-4 py-3 text-sm rounded-xl hover:bg-surface-hover transition-colors duration-200 flex items-center gap-3 group/item disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center group-hover/item:bg-primary/20 transition-colors">
                        <LinkIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">Copy Link</div>
                        <div className="text-xs text-foreground-tertiary">Share your current availability</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 max-w-7xl mx-auto w-full">
        {/* Calendar Section */}
        <section className="flex-1 lg:flex-[7] animate-fade-in">
          <div className="glass rounded-3xl p-6 h-full min-h-[600px]">
            <Calendar
              timezone={userTimezone}
              availability={availability}
              onEventClick={(event: { start: string; end: string; type: 'free' | 'busy' }) => {
                const startTime = new Date(event.start).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                const endTime = new Date(event.end).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
                showNotification(`${event.type === 'free' ? 'Free' : 'Busy'}: ${startTime} - ${endTime}`);
              }}
            />
          </div>
        </section>

        {/* Input & Controls Section */}
        <section className="w-full lg:w-80 lg:flex-[3] animate-slide-up">
          <div className="h-full flex flex-col">
            {/* Natural Language Input */}
            <div className="glass rounded-3xl p-6 flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Add Availability</h2>
                  <p className="text-sm text-foreground-tertiary">Tell me when you're free</p>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col gap-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleInputSubmit();
                    }
                  }}
                  placeholder="e.g., I'm free tomorrow from 9am to 5pm, but busy from 12pm to 1pm for lunch."
                  className="input-primary flex-1 min-h-[120px] resize-none text-sm leading-relaxed rounded-2xl px-4 py-4"
                  disabled={loading}
                  rows={5}
                />
                
                <div className="flex items-center justify-end">
                  <button
                    onClick={handleInputSubmit}
                    className="btn btn-primary flex items-center gap-2 px-6 py-3 text-sm font-medium"
                    disabled={loading || !inputText.trim()}
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Parsing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Add to Calendar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm animate-slide-up">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-destructive rounded-full flex-shrink-0"></div>
                    {error}
                  </div>
                </div>
              )}

              {/* Example suggestions */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xs font-medium text-foreground-secondary mb-3">Quick examples:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "I'm free tomorrow 9am-5pm",
                    "Available this weekend",
                    "Free today except 12-1pm",
                    "Monday to Friday 9-5"
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setInputText(example)}
                      className="text-xs bg-surface-elevated hover:bg-surface-hover text-foreground-secondary px-3 py-2 rounded-full transition-all duration-200 hover:text-foreground border border-border/50 hover:border-border-light"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Notification */}
      {notification && (
        <div className="notification animate-slide-up">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full"></div>
            {notification}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return <TimezoneScheduler />;
}
