import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, isSameDay, parseISO } from 'date-fns';

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

const overlapColor = 'bg-green-600 text-white';
const defaultUserColors = [
  'bg-blue-600 text-white',
  'bg-purple-600 text-white',
  'bg-pink-600 text-white',
  'bg-yellow-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
  'bg-orange-600 text-white',
];

const Calendar: React.FC<CalendarProps> = ({ timezone, availability, onEventClick, userColors }) => {
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const grouped = groupEventsByDay(availability);

  // Assign a color to each user if not provided
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

  return (
    <div className="w-full max-w-2xl mx-auto p-2 md:p-4 bg-black rounded-lg shadow-lg">
      <DayPicker
        mode="single"
        selected={selectedDay}
        onSelect={setSelectedDay}
        modifiers={{
          hasEvents: Object.keys(grouped).map((day) => new Date(day)),
        }}
        modifiersClassNames={{
          hasEvents: 'border-2 border-green-400',
        }}
        className="text-white bg-black"
        styles={{
          caption: { color: 'white' },
          head_cell: { color: '#a3a3a3' },
          cell: { background: 'transparent' },
        }}
      />
      <div className="mt-4">
        {selectedDay ? (
          <>
            <h3 className="text-lg font-semibold mb-2 text-white">
              {format(selectedDay, 'EEEE, MMMM d, yyyy')}
            </h3>
            {eventsForSelectedDay.length === 0 ? (
              <p className="text-gray-400">No events for this day.</p>
            ) : (
              <ul className="space-y-2">
                {eventsForSelectedDay.map((event, idx) => {
                  const colorClass =
                    event.type === 'overlap'
                      ? overlapColor
                      : event.user
                      ? userColorMap[event.user]
                      : 'bg-gray-700 text-white';
                  return (
                    <li
                      key={idx}
                      className={`rounded px-3 py-2 cursor-pointer flex items-center gap-2 ${colorClass} hover:opacity-80`}
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      {event.user && (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/20 font-bold text-xs mr-2">
                          {getInitials(event.user)}
                        </span>
                      )}
                      <span className="font-mono">
                        {format(parseISO(event.start), 'HH:mm')} - {format(parseISO(event.end), 'HH:mm')}
                      </span>
                      <span className="ml-2 text-xs uppercase">{event.type === 'overlap' ? 'overlap' : event.type}</span>
                      {event.user && (
                        <span className="ml-auto text-xs text-white/80">{event.user}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="text-gray-400">Select a day to view events.</p>
        )}
      </div>
    </div>
  );
};

export default Calendar;
