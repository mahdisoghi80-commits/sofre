interface ServerlessRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (data: unknown) => void;
  end: () => void;
  setHeader: (key: string, value: string) => void;
}

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  const rawOrigin = req.headers.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    ok: true,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
}
