"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Calendar from "../../components/Calendar";

interface AvailabilityEvent {
  start: string;
  end: string;
  type: "free" | "busy" | "overlap";
  user?: string;
}

export default function SheetPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const sheetId = params.id;
  const [userName, setUserName] = useState("");
  const [inputText, setInputText] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [availability, setAvailability] = useState<AvailabilityEvent[]>([]);
  const [users, setUsers] = useState<{ user: string; slots: { start: string; end: string }[] }[]>([]);
  const [overlap, setOverlap] = useState<{ start: string; end: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [chat, setChat] = useState<{ user: string; text: string; timestamp: number }[]>([]);
  const [chatInput, setChatInput] = useState("");

  // Show notification when users list changes
  useEffect(() => {
    if (users.length > 0) {
      setNotification("User list updated!");
      setTimeout(() => setNotification(null), 2000);
    }
  }, [users.length]);

  // Remove my schedule
  const handleRemoveMySchedule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "remove",
          timezone,
          sheetId,
          userName,
          remove: true,
        }),
      });
      setInputText("");
      setNotification("Your schedule was removed.");
      setTimeout(() => setNotification(null), 2000);
    } catch {
      setError("Failed to remove schedule.");
    } finally {
      setLoading(false);
    }
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setNotification("Link copied!");
    setTimeout(() => setNotification(null), 1500);
  };

  // Export as .ics
  const handleExportICS = () => {
    if (!userName) return;
    const user = users.find(u => u.user === userName);
    if (!user || !user.slots.length) return;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatICSDate = (iso: string) => {
      const d = new Date(iso);
      return (
        d.getUTCFullYear().toString() +
        pad(d.getUTCMonth() + 1) +
        pad(d.getUTCDate()) +
        'T' +
        pad(d.getUTCHours()) +
        pad(d.getUTCMinutes()) +
        pad(d.getUTCSeconds()) +
        'Z'
      );
    };
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//FreeWhen//EN\n';
    user.slots.forEach((slot, i) => {
      ics += 'BEGIN:VEVENT\n';
      ics += `UID:${userName}-${i}@freewhen\n`;
      ics += `DTSTAMP:${formatICSDate(new Date().toISOString())}\n`;
      ics += `DTSTART:${formatICSDate(slot.start)}\n`;
      ics += `DTEND:${formatICSDate(slot.end)}\n`;
      ics += `SUMMARY:FreeWhen Availability\n`;
      ics += `DESCRIPTION:Added via FreeWhen\n`;
      ics += 'END:VEVENT\n';
    });
    ics += 'END:VCALENDAR';
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freewhen-${userName}.ics`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  };

  // Fetch all users' availabilities for this sheet
  const fetchAvailabilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "", // empty message to just fetch
          timezone,
          sheetId,
          userName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setOverlap(data.overlap || []);
        // Flatten all slots for calendar
        const allEvents: AvailabilityEvent[] = [];
        data.users.forEach((u: any) => {
          u.slots.forEach((slot: any) => {
            allEvents.push({ ...slot, type: "free", user: u.user });
          });
        });
        // Add overlap as special events
        data.overlap?.forEach((slot: any) => {
          allEvents.push({ ...slot, type: "overlap" });
        });
        setAvailability(allEvents);
      } else {
        setError(data.error || "Could not fetch availabilities.");
      }
    } catch (e) {
      setError("Failed to connect to API.");
    } finally {
      setLoading(false);
    }
  };

  // Send typing event
  const sendTyping = () => {
    fetch(`/api/sheet-typing/${sheetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName }),
    });
  };

  // Fetch chat history on mount
  useEffect(() => {
    fetch(`/api/sheet-chat/${sheetId}`)
      .then(res => res.json())
      .then(data => setChat(data.chat || []));
  }, [sheetId]);

  // Listen for typing events via SSE
  useEffect(() => {
    const es = new EventSource(`/api/sheet-updates/${sheetId}`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.chat) setChat(prev => [...prev, ...data.chat]);
        if (data.users) setUsers(data.users);
        if (data.overlap) setOverlap(data.overlap);
        if (data.typingUsers) setTypingUsers(data.typingUsers);
        // Flatten all slots for calendar
        const allEvents: AvailabilityEvent[] = [];
        data.users?.forEach((u: any) => {
          u.slots.forEach((slot: any) => {
            allEvents.push({ ...slot, type: "free", user: u.user });
          });
        });
        data.overlap?.forEach((slot: any) => {
          allEvents.push({ ...slot, type: "overlap" });
        });
        setAvailability(allEvents);
      } catch {}
    };
    return () => {
      es.close();
    };
  }, [sheetId]);

  // Listen for chat messages via SSE
  useEffect(() => {
    const es = new EventSource(`/api/sheet-updates/${sheetId}`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.chat) setChat(prev => [...prev, ...data.chat]);
        if (data.users) setUsers(data.users);
        if (data.overlap) setOverlap(data.overlap);
        if (data.typingUsers) setTypingUsers(data.typingUsers);
        // Flatten all slots for calendar
        const allEvents: AvailabilityEvent[] = [];
        data.users?.forEach((u: any) => {
          u.slots.forEach((slot: any) => {
            allEvents.push({ ...slot, type: "free", user: u.user });
          });
        });
        data.overlap?.forEach((slot: any) => {
          allEvents.push({ ...slot, type: "overlap" });
        });
        setAvailability(allEvents);
      } catch {}
    };
    return () => {
      es.close();
    };
  }, [sheetId]);

  // On input, send typing event
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    sendTyping();
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      // Optionally, send a stop-typing event
    }, 2000);
  };

  // Handle submit
  const handleInputSubmit = async () => {
    if (!inputText.trim() || !userName.trim()) {
      setError("Please enter your name and availability.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputText,
          timezone,
          sheetId,
          userName,
        }),
      });
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setOverlap(data.overlap || []);
        // Flatten all slots for calendar
        const allEvents: AvailabilityEvent[] = [];
        data.users.forEach((u: any) => {
          u.slots.forEach((slot: any) => {
            allEvents.push({ ...slot, type: "free", user: u.user });
          });
        });
        // Add overlap as special events
        data.overlap?.forEach((slot: any) => {
          allEvents.push({ ...slot, type: "overlap" });
        });
        setAvailability(allEvents);
        setInputText("");
      } else {
        setError(data.error || "Could not parse input.");
      }
    } catch (e) {
      setError("Failed to connect to API.");
    } finally {
      setLoading(false);
    }
  };

  // Send chat message
  const handleSendChat = async () => {
    if (!chatInput.trim() || !userName.trim()) return;
    await fetch(`/api/sheet-chat/${sheetId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName, text: chatInput }),
    });
    setChatInput("");
  };

  // Shareable URL
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">FreeWhen Sheet: {sheetId}</h1>
        <div className="mb-4">
          <label className="block mb-1 text-gray-300">Your Name:</label>
          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white mb-2"
            placeholder="Enter your name"
          />
          <label className="block mb-1 text-gray-300">Your Availability:</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={e => e.key === "Enter" && handleInputSubmit()}
              placeholder="e.g., I'm free tomorrow from 9am to 5pm except 12-1pm"
              className="flex-1 px-4 py-2 rounded bg-gray-900 border border-gray-700 text-white"
              disabled={loading}
            />
            <button
              onClick={handleInputSubmit}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={loading}
            >
              {loading ? "Parsing..." : "Add"}
            </button>
          </div>
          {error && <div className="text-red-400 mt-2">{error}</div>}
        </div>
        {typingUsers.length > 0 && (
          <div className="text-green-400 text-sm mb-2">
            {typingUsers.filter(u => u !== userName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}
        <div className="mb-4 flex items-center gap-2">
          <label className="block text-gray-400 mb-1">Share this link with others:</label>
          <button
            onClick={handleCopyLink}
            className="ml-2 px-3 py-1 rounded bg-blue-700 hover:bg-blue-800 text-white text-xs"
          >
            Copy Link
          </button>
        </div>
        <input
          type="text"
          value={shareUrl}
          readOnly
          className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 cursor-pointer mb-2"
          onFocus={e => e.target.select()}
        />
        <button
          onClick={handleRemoveMySchedule}
          className="mb-4 px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
          disabled={loading || !userName}
        >
          Remove My Schedule
        </button>
        <button
          onClick={handleExportICS}
          className="mb-4 ml-2 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
          disabled={!userName || !users.find(u => u.user === userName)?.slots.length}
        >
          Export as .ics
        </button>
        {notification && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-700 text-white px-4 py-2 rounded shadow-lg z-50">
            {notification}
          </div>
        )}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">All Availabilities</h2>
          <ul className="mb-2">
            {users.map(u => (
              <li key={u.user} className="mb-1 text-gray-200 flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-blue-200 font-bold text-sm">
                  {u.user.slice(0,2).toUpperCase()}
                </span>
                <span className="font-bold text-blue-300">{u.user}</span> ({timezone})
                <span className="ml-2 text-xs text-gray-400">{u.slots.length} slot(s)</span>
              </li>
            ))}
          </ul>
          <Calendar
            timezone={timezone}
            availability={availability.map(ev =>
              ev.type === "overlap"
                ? { ...ev, type: "free" } // Overlap shown as free (green)
                : ev
            )}
            onEventClick={event => {
              alert(
                `User: ${event.user || "(overlap)"}\n${event.start} - ${event.end}`
              );
            }}
          />
        </div>
        {/* Chat/comments section */}
        <div className="mb-6 bg-gray-900 rounded-lg p-4 shadow-inner">
          <h2 className="text-lg font-semibold mb-2 text-blue-200">Sheet Chat</h2>
          <div className="max-h-48 overflow-y-auto mb-2 space-y-2">
            {chat.map((msg, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-blue-200 font-bold text-sm mt-1">
                  {msg.user.slice(0,2).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm text-blue-100 font-bold">{msg.user}</div>
                  <div className="text-gray-200 text-sm">{msg.text}</div>
                  <div className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendChat()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
              disabled={!userName}
            />
            <button
              onClick={handleSendChat}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              disabled={!userName || !chatInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
