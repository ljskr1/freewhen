import { NextApiRequest, NextApiResponse } from 'next';

// In-memory pub/sub for sheet updates
const subscribers: { [sheetId: string]: Set<NextApiResponse> } = {};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    query: { id: sheetId },
  } = req;
  if (!sheetId || typeof sheetId !== 'string') {
    res.status(400).end('Missing sheet id');
    return;
  }

  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('\n');

  // Add to subscribers
  if (!subscribers[sheetId]) subscribers[sheetId] = new Set();
  subscribers[sheetId].add(res);

  // Remove on close
  req.on('close', () => {
    subscribers[sheetId].delete(res);
  });
}

// Helper to broadcast updates to all subscribers
export function broadcastSheetUpdate(sheetId: string, data: any) {
  if (!subscribers[sheetId]) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers[sheetId]) {
    try {
      res.write(payload);
    } catch {
      // Ignore broken pipes
    }
  }
}
