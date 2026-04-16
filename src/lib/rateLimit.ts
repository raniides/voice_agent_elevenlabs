const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function checkConversationSessionRateLimit(clientKey: string): boolean {
  const now = Date.now();
  let bucket = buckets.get(clientKey);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(clientKey, bucket);
  }
  bucket.count += 1;
  return bucket.count <= MAX_REQUESTS;
}
