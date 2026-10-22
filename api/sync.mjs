// Cloud copy of the app state for syncing the phone and the web version.
// Each person's data lives in a private Vercel Blob at s/<key>.json, where <key> is a SHA-256
// hash of their sync passphrase computed on the device. Needs a Blob store connected to this
// project (it provides BLOB_READ_WRITE_TOKEN).
import { get, put } from '@vercel/blob';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const keyOf = req => { const k = new URL(req.url).searchParams.get('k') || ''; return /^[a-f0-9]{64}$/.test(k) ? k : null };
const ready = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export function OPTIONS() { return new Response(null, { status: 204, headers: CORS }) }

export async function GET(req) {
  const k = keyOf(req); if (!k) return json({ error: 'bad key' }, 400);
  if (!ready()) return json({ error: 'storage not connected' }, 503);
  const r = await get(`s/${k}.json`, { access: 'private', useCache: false }).catch(() => null);
  if (!r || r.statusCode !== 200) return json({ data: null });
  return json({ data: JSON.parse(await new Response(r.stream).text()) });
}

export async function PUT(req) {
  const k = keyOf(req); if (!k) return json({ error: 'bad key' }, 400);
  if (!ready()) return json({ error: 'storage not connected' }, 503);
  const text = await req.text();
  if (text.length > 4e6) return json({ error: 'too large' }, 413);
  let body; try { body = JSON.parse(text) } catch (e) { return json({ error: 'bad json' }, 400) }
  if (!body || typeof body.data != 'object') return json({ error: 'missing data' }, 400);
  await put(`s/${k}.json`, JSON.stringify(body.data), { access: 'private', allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json' });
  return json({ ok: true });
}
