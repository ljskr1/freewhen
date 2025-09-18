import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarPlus, Clock, User } from 'lucide-react';

interface AvailabilityEvent {
  start: string;
  end: string;
  type: 'free' | 'busy' | 'overlap';
  user?: string;
}

interface CalendarProps {
  timezone: string;
  availability: AvailabilityEvent[];
  onEventClick?: (event: AvailabilityEvent) => void;
  userColors?: { [user: string]: string };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0]?.toUpperCase())
    .join('');
}

function groupEventsByDay(events: AvailabilityEvent[]) {
  const grouped: { [date: string]: AvailabilityEvent[] } = {};
  events.forEach((event) => {
    const day = format(parseISO(event.start), 'yyyy-MM-dd');
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(event);
  });
  return grouped;
}

const defaultUserColors = [
  '#3b82f6', '#8b5cf6', '#ec4899',
  '#f59e0b', '#6366f1', '#14b8a6',
  '#f97316'
];

const Calendar: React.FC<CalendarProps> = ({ timezone, availability, onEventClick, userColors }) => {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const grouped = groupEventsByDay(availability);

  const userColorMap: { [user: string]: string } = { ...userColors };
  let colorIdx = 0;
  availability.forEach((ev) => {
    if (ev.user && !userColorMap[ev.user]) {
      userColorMap[ev.user] = defaultUserColors[colorIdx % defaultUserColors.length];
      colorIdx++;
    }
  });

  const eventsForSelectedDay = selectedDay
    ? grouped[format(selectedDay, 'yyyy-MM-dd')] || []
    : [];

  const getEventStyle = (event: AvailabilityEvent) => {
    const style: React.CSSProperties = {};
    switch (event.type) {
      case 'free':
        style.backgroundColor = '#30d158';
        break;
      case 'busy':
        style.backgroundColor = '#ff9f0a';
        break;
      case 'overlap':
        style.backgroundColor = '#5856d6';
        break;
      default:
        style.backgroundColor = '#2c2c2e';
    }
    if (event.user && userColorMap[event.user]) {
      style.borderLeft = `4px solid ${userColorMap[event.user]}`;
    }
    return style;
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4">
      {/* Calendar Picker */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-700">
          <DayPicker
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            modifiers={{
              hasEvents: Object.keys(grouped).map((dayStr) => {
                const date = new Date(dayStr);
                return new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
              }),
            }}
            modifiersClassNames={{
              hasEvents: 'bg-blue-500/20 border border-blue-500/50 rounded',
            }}
            className="text-white"
            styles={{
              caption: { color: 'white', fontSize: '1.1rem', fontWeight: '600' },
              head_cell: { color: '#9ca3af', fontSize: '0.75rem', fontWeight: '500' },
              cell: { color: 'white' },
              day: { 
                color: 'white',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                fontSize: '0.875rem'
              },
              day_selected: { 
                backgroundColor: '#007aff',
                color: 'white',
                fontWeight: '600'
              },
              day_today: { 
                fontWeight: '600',
                border: '2px solid #4a4a4c'
              }
            }}
          />
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 flex flex-col min-h-0">
        {selectedDay ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {format(selectedDay, 'EEEE, MMMM d')}
                </h3>
                <p className="text-sm text-gray-400">
                  {eventsForSelectedDay.length} {eventsForSelectedDay.length === 1 ? 'event' : 'events'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock className="w-4 h-4" />
                <span>{timezone.split('/')[1]?.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {eventsForSelectedDay.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                  <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                    <CalendarPlus className="w-6 h-6 text-gray-500" />
                  </div>
                  <h4 className="font-semibold text-white mb-1">All clear!</h4>
                  <p className="text-sm text-gray-400 mb-1">No availability scheduled for this day.</p>
                  <p className="text-xs text-gray-500">Add your free times using the form on the right.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventsForSelectedDay
                    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .map((event, idx) => {
                      const eventStyle = getEventStyle(event);
                      const startTime = format(parseISO(event.start), 'HH:mm');
                      const endTime = format(parseISO(event.end), 'HH:mm');
                      const duration = Math.round((new Date(event.end).getTime() - new Date(event.start).getTime()) / (1000 * 60));

                      return (
                        <div
                          key={`${format(selectedDay, 'yyyy-MM-dd')}-${idx}`}
                          className="rounded-xl p-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] border border-gray-700"
                          style={eventStyle}
                          onClick={() => onEventClick && onEventClick(event)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono font-semibold text-white">
                                  {startTime} - {endTime}
                                </span>
                                <span className="text-xs uppercase font-bold text-white/60 bg-white/15 px-1.5 py-0.5 rounded">
                                  {event.type}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1.5 text-xs text-white/70">
                                <Clock className="w-3 h-3" />
                                <span>{duration} min</span>
                              </div>
                            </div>

                            {event.user && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-white/80">{event.user}</span>
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white"
                                  style={{ backgroundColor: userColorMap[event.user] || '#6b7280' }}
                                >
                                  {getInitials(event.user)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-3">
              <CalendarPlus className="w-6 h-6 text-gray-500" />
            </div>
            <h4 className="font-semibold text-white mb-1">Select a day</h4>
            <p className="text-sm text-gray-400">Choose a date from the calendar to view your availability.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Calendar;
