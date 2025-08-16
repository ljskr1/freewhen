'use client'

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Send, Users, Plus, Trash2 } from 'lucide-react';

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userLocation, setUserLocation] = useState('Toronto, Canada');
  const [friendLocation, setFriendLocation] = useState('Sydney, Australia');
  const [userTimezone, setUserTimezone] = useState('America/Toronto');
  const [friendTimezone, setFriendTimezone] = useState('Australia/Sydney');
  const [events, setEvents] = useState<Event[]>([]);
  const [inputText, setInputText] = useState('');
  const [overlappingTimes, setOverlappingTimes] = useState<Event[]>([]);

  // Sample events for demonstration
  useEffect(() => {
    const sampleEvents: Event[] = [
      {
        id: 1,
        title: 'Work',
        startTime: '09:00',
        endTime: '17:00',
        date: new Date().toISOString().split('T')[0],
        type: 'busy',
        user: 'you'
      },
      {
        id: 2,
        title: 'Free time',
        startTime: '19:00',
        endTime: '23:00',
        date: new Date().toISOString().split('T')[0],
        type: 'free',
        user: 'you'
      }
    ];
    setEvents(sampleEvents);
  }, []);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Parse natural language input (simplified version)
  const parseNaturalLanguage = (text: string): Event | null => {
    const lowerText = text.toLowerCase();
    const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/gi;
    const dayRegex = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow)/i;
    const dateRegex = /(\d{1,2})\/(\d{1,2})/;
    
    let matches: RegExpExecArray[] = [];
    let match;
    while ((match = timeRegex.exec(text)) !== null) {
      matches.push(match);
    }
    
    const dayMatch = text.match(dayRegex);
    const dateMatch = text.match(dateRegex);
    
    if (matches.length >= 2) {
      const startHour = parseInt(matches[0][1]);
      const startAmPm = matches[0][3];
      const endHour = parseInt(matches[1][1]);
      const endAmPm = matches[1][3];
      
      const convertTo24Hour = (hour: number, ampm: string) => {
        if (ampm.toLowerCase() === 'pm' && hour !== 12) return hour + 12;
        if (ampm.toLowerCase() === 'am' && hour === 12) return 0;
        return hour;
      };
      
      const startTime24 = convertTo24Hour(startHour, startAmPm);
      const endTime24 = convertTo24Hour(endHour, endAmPm);
      
      let eventDate = new Date().toISOString().split('T')[0];
      if (dayMatch) {
        // Simple day parsing - you could enhance this
        eventDate = new Date().toISOString().split('T')[0];
      }
      
      const eventType: 'free' | 'busy' = lowerText.includes('free') || lowerText.includes('available') ? 'free' : 'busy';
      const title = lowerText.includes('work') ? 'Work' : 
                   lowerText.includes('school') ? 'School' :
                   lowerText.includes('sleep') ? 'Sleep' :
                   eventType === 'free' ? 'Free time' : 'Busy';
      
      return {
        id: 0, // Temporary ID, will be replaced when creating the actual event
        title,
        startTime: `${startTime24.toString().padStart(2, '0')}:00`,
        endTime: `${endTime24.toString().padStart(2, '0')}:00`,
        date: eventDate,
        type: eventType,
        user: 'you'
      };
    }
    return null;
  };

  const handleInputSubmit = () => {
    if (!inputText.trim()) return;
    
    const parsedEvent = parseNaturalLanguage(inputText);
    if (parsedEvent) {
      const newEvent: Event = {
        ...parsedEvent,
        id: Date.now()
      };
      setEvents([...events, newEvent]);
      setInputText('');
    }
  };

  const formatTimeInTimezone = (date: Date, timezone: string) => {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateStr);
  };

  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                TimeSync
              </h1>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{userLocation}</span>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{friendLocation}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Calendar Section - 80% height */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 mb-6" style={{height: '70vh'}}>
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-800">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  ←
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-auto" style={{height: 'calc(100% - 100px)'}}>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day);
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const hasFreeTime = dayEvents.some(event => event.type === 'free');
                
                return (
                  <div
                    key={index}
                    className={`
                      min-h-[80px] p-2 rounded-xl border transition-all hover:shadow-md
                      ${isCurrentMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 text-gray-400'}
                      ${isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                      ${hasFreeTime ? 'bg-green-50 border-green-200' : ''}
                    `}
                  >
                    <div className="text-sm font-medium mb-1">{day.getDate()}</div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`
                            text-xs px-2 py-1 rounded-md truncate
                            ${event.type === 'free' 
                              ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }
                          `}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Chat Interface Section */}
        <div className="bg-white/60 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20">
          <div className="p-6 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Quick Schedule
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Tell me your schedule in natural language, like "I have work on Sunday 6pm-10pm and I'm free from 11pm-2am"
            </p>
          </div>
          
          <div className="p-6">
            <div className="flex space-x-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleInputSubmit()}
                placeholder="e.g., I'm free tomorrow from 7pm to 11pm"
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleInputSubmit}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Send className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
            
            {/* Recent Events */}
            {events.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Schedule Items</h4>
                <div className="space-y-2">
                  {events.slice(-3).map(event => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${event.type === 'free' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-gray-700">
                          {event.title} - {event.startTime} to {event.endTime}
                        </span>
                      </div>
                      <button
                        onClick={() => setEvents(events.filter(e => e.id !== event.id))}
                        className="p-1 hover:bg-gray-200 rounded-full"
                      >
                        <Trash2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timezone Display */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Your Time ({userLocation})</h4>
            <div className="text-2xl font-mono text-blue-600">
              {formatTimeInTimezone(new Date(), userTimezone)}
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
            <h4 className="font-semibold text-gray-800 mb-2">Friend's Time ({friendLocation})</h4>
            <div className="text-2xl font-mono text-purple-600">
              {formatTimeInTimezone(new Date(), friendTimezone)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return <TimezoneScheduler />;
}
