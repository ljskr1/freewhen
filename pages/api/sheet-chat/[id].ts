import { NextApiRequest, NextApiResponse } from 'next';
import { broadcastSheetUpdate } from '../sheet-updates/[id]';

// In-memory chat messages per sheet
const chatMessages: { [sheetId: string]: { user: string; text: string; timestamp: number }[] } = {};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id: sheetId },
    method,
    body,
  } = req;
  if (!sheetId || typeof sheetId !== 'string') {
    res.status(400).end('Missing sheet id');
    return;
  }

  if (method === 'POST') {
    const { userName, text } = body;
    if (!userName || !text) {
      res.status(400).end('Missing userName or text');
      return;
    }
    if (!chatMessages[sheetId]) chatMessages[sheetId] = [];
    const message = { user: userName, text, timestamp: Date.now() };
    chatMessages[sheetId].push(message);
    // Broadcast new message
    broadcastSheetUpdate(sheetId, { chat: [message] });
    res.status(200).json({ ok: true });
    return;
  }

  if (method === 'GET') {
    res.status(200).json({ chat: chatMessages[sheetId] || [] });
    return;
  }

  res.status(405).end('Method Not Allowed');
}
