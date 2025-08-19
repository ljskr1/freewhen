import { NextApiRequest, NextApiResponse } from 'next';
import { broadcastSheetUpdate } from '../sheet-updates/[id]';

// In-memory typing users per sheet
const typingUsers: { [sheetId: string]: Set<string> } = {};
const typingTimeouts: { [sheetId: string]: { [user: string]: NodeJS.Timeout } } = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id: sheetId },
    body: { userName },
  } = req;
  if (!sheetId || typeof sheetId !== 'string' || !userName) {
    res.status(400).end('Missing sheet id or userName');
    return;
  }

  if (!typingUsers[sheetId]) typingUsers[sheetId] = new Set();
  if (!typingTimeouts[sheetId]) typingTimeouts[sheetId] = {};
  typingUsers[sheetId].add(userName);

  // Broadcast typing users
  broadcastSheetUpdate(sheetId, { typingUsers: Array.from(typingUsers[sheetId]) });

  // Remove after 3s if no further typing event
  if (typingTimeouts[sheetId][userName]) clearTimeout(typingTimeouts[sheetId][userName]);
  typingTimeouts[sheetId][userName] = setTimeout(() => {
    typingUsers[sheetId].delete(userName);
    broadcastSheetUpdate(sheetId, { typingUsers: Array.from(typingUsers[sheetId]) });
  }, 3000);

  res.status(200).end('OK');
}
