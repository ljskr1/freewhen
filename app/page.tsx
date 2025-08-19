'use client'

import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Send, Users, Plus, Trash2, Share2, Calendar as CalendarIcon } from 'lucide-react';
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
  const handleCreateSheet = () => {
    const id = Math.random().toString(36).slice(2, 10);
    router.push(`/sheet/${id}`);
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 glass border-b border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold">FreeWhen</h1>
            </div>
            <select
              value={userTimezone}
              onChange={(e) => setUserTimezone(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>
                  {tz.split('/')[1]?.replace('_', ' ') || tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleCreateSheet}
            className="btn-accent flex items-center justify-center gap-2 w-full"
          >
            <Plus className="w-5 h-5" />
            Create Shared Sheet
          </button>
          <button
            onClick={handleShare}
            className="btn-secondary flex items-center justify-center gap-2 w-full"
            disabled={availability.length === 0}
          >
            <Share2 className="w-5 h-5" />
            Share Availability
          </button>
        </div>

        {/* Natural Language Input */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Tell me your availability</h2>
          </div>
          
          <div className="space-y-3">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleInputSubmit();
                }
              }}
              placeholder="e.g., I'm free tomorrow from 9am to 5pm except 12-1pm for lunch"
              className="input-primary w-full min-h-[80px] resize-none"
              disabled={loading}
              rows={3}
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Press Enter to add • Shift+Enter for new line
              </div>
              <button
                onClick={handleInputSubmit}
                className="btn-primary flex items-center gap-2"
                disabled={loading || !inputText.trim()}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="loading-dots">Parsing</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Add Availability
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-up">
              {error}
            </div>
          )}

          {/* Example suggestions */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-400 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "I'm free tomorrow 9am-5pm",
                "I don't have work Monday",
                "Free today except 12-1pm",
                "Available this weekend"
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInputText(example)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded-full transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Calendar</h2>
            {availability.length > 0 && (
              <div className="text-sm text-gray-400">
                {availability.length} time slot{availability.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
          
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

        {/* Tips Section */}
        <div className="glass-light rounded-2xl p-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-green-400" />
            Pro Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Use natural language like "I'm free tomorrow 9am-5pm"</li>
            <li>• Create shared sheets to coordinate with friends</li>
            <li>• The app understands different time formats and timezones</li>
            <li>• Green overlaps show when everyone is available</li>
          </ul>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="notification">
          {notification}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  return <TimezoneScheduler />;
}
