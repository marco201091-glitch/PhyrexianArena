import https from 'node:https';

export const MOXFIELD_USER_AGENT = process.env.MOXFIELD_USER_AGENT
  || 'PostmanRuntime/7.31.1';

export function buildMoxfieldHeaders(): Record<string, string> {
  return {
    'User-Agent': MOXFIELD_USER_AGENT,
    'Content-Type': 'application/json; charset=utf-8',
  };
}

export function moxfieldHttpsGet(url: string, headers: Record<string, string>) {
  const parsed = new URL(url);

  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

export function buildMoxfieldApiUrls(publicId: string): string[] {
  const encoded = encodeURIComponent(publicId);
  return [
    `https://api2.moxfield.com/v2/decks/all/${encoded}`,
    `https://api2.moxfield.com/v3/decks/all/${encoded}`,
  ];
}