/**
 * The archive's one connection to Supabase.
 *
 * PostgREST and Storage are plain HTTP and Node has fetch, so this is deliberately not
 * @supabase/supabase-js: the repo ships three production dependencies and a client used
 * by two build scripts is not worth a fourth. Everything here runs at BUILD time. No
 * browser ever holds these credentials and the published site never calls this database.
 *
 * The secret key is used, not the publishable one. Reads must see the whole archive
 * including rows a curator has not finished reviewing, and RLS grants `anon` nothing.
 */
import { existsSync } from 'node:fs';

const fail = (msg) => {
  console.error(`\n  supabase: ${msg}\n`);
  process.exit(1);
};

// Node's own .env reader — no dotenv dependency. Vercel injects the real environment, so
// a missing file is normal there and only a missing VALUE is an error.
for (const f of ['.env.local', '.env']) {
  if (existsSync(f)) { try { process.loadEnvFile(f); } catch { /* malformed: env wins */ } }
}

const URL_ = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const KEY = process.env.SUPABASE_SECRET_KEY;

/*
 * No fallback, and that is the point. build-data.mjs used to exit 0 with "skipping
 * (DataModel not found, using committed data)" when its source was missing — a green
 * terminal that had tested nothing, and it hid a wrong path for an afternoon while every
 * edit was a silent no-op. Supabase is now the only source of record, so there is no
 * legitimate way to build without it. Say so and stop.
 */
export function requireCredentials() {
  if (!URL_ || !KEY) {
    const missing = [!URL_ && 'SUPABASE_URL', !KEY && 'SUPABASE_SECRET_KEY'].filter(Boolean);
    fail(`${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set.\n`
      + '  Locally: APPEND the lines in .env.example to .env.local — do not copy over it,\n'
      + '           it already holds VERCEL_OIDC_TOKEN from `vercel env pull`.\n'
      + '  On Vercel: project sievan-archive -> Settings -> Environment Variables.\n'
      + '  There is no local fallback — the archive lives in Supabase now.');
  }
  return { url: URL_, key: KEY };
}

const headers = () => ({
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, init = {}) {
  const { url } = requireCredentials();
  const attempts = 4;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res;
    try {
      res = await fetch(`${url}${path}`, { ...init, headers: { ...headers(), ...init.headers } });
    } catch (e) {
      if (attempt < attempts) {
        await sleep(attempt * 1000);
        continue;
      }
      fail(`cannot reach ${url}${path}: ${e.message}`);
    }

    if (res.ok) return res;

    const body = await res.text().catch(() => '');
    const clockSkew = res.status === 401 && /JWT issued at future/i.test(body);
    if (clockSkew && attempt < attempts) {
      console.warn(`  supabase: JWT clock skew on ${path}; retrying (${attempt}/${attempts - 1})`);
      await sleep(attempt * 1500);
      continue;
    }

    fail(`${init.method ?? 'GET'} ${path} -> ${res.status} ${res.statusText}\n  ${body.slice(0, 600)}`);
  }
}

/** Every row of a table or view, in a stable order. */
export async function selectAll(relation, { order = 'id.asc', schema } = {}) {
  const res = await request(`/rest/v1/${relation}?select=*${order ? `&order=${order}` : ''}`, {
    headers: schema ? { 'Accept-Profile': schema } : {},
  });
  return res.json();
}

/**
 * Insert or replace rows, in batches PostgREST will accept in one statement.
 *
 * PostgREST builds one INSERT per batch and so rejects a batch whose objects have
 * different key sets ("All object keys must match"). The archive's records genuinely do:
 * date_basis is absent on 47 of 57 attested works rather than null, and artwork is absent
 * on 51 of 76 archive objects. So widen every row to the union of the batch's keys, with
 * null for the ones it does not carry — which is what the column would hold anyway, since
 * nothing anywhere distinguishes an absent field from a null one.
 */
export async function upsert(table, rows, { schema, chunk = 200 } = {}) {
  if (!rows.length) return 0;
  const keys = [...new Set(rows.flatMap(Object.keys))];
  const widen = (r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));
  for (let i = 0; i < rows.length; i += chunk) {
    await request(`/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
        ...(schema ? { 'Content-Profile': schema } : {}),
      },
      body: JSON.stringify(rows.slice(i, i + chunk).map(widen)),
    });
  }
  return rows.length;
}

/**
 * Create a bucket if it is not there, PRIVATE.
 *
 * Private is the whole point and is not a default worth trusting to a dashboard click: a
 * public bucket would put a second, uncontrolled copy of the archive on the internet,
 * outside the estate's own pages and their provenance notes, and would bill egress per
 * visitor. The build reads with the secret key; the site serves its own copies from out/.
 */
export async function ensureBucket(name) {
  const { url } = requireCredentials();
  const res = await fetch(`${url}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ id: name, name, public: false }),
  });
  if (res.ok) return 'created';
  const body = await res.text().catch(() => '');
  // Already there is the normal case on every run after the first.
  if (res.status === 409 || /already exists|Duplicate/i.test(body)) return 'exists';
  fail(`could not create bucket ${name}: ${res.status} ${body.slice(0, 300)}`);
}

/** Everything in a storage bucket, as {name, size, etag}. Paginates; buckets are private. */
export async function storageList(bucket, prefix = '') {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const res = await request(`/storage/v1/object/list/${encodeURIComponent(bucket)}`, {
      method: 'POST',
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    const page = await res.json();
    for (const o of page) {
      // A "folder" comes back with a null id and must be walked, not downloaded.
      if (o.id === null) out.push(...await storageList(bucket, `${prefix}${o.name}/`));
      else out.push({ path: `${prefix}${o.name}`, size: o.metadata?.size ?? null, etag: o.metadata?.eTag ?? null });
    }
    if (page.length < 100) break;
  }
  return out;
}

/** One object's bytes. */
export async function storageDownload(bucket, path) {
  const res = await request(`/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Create or replace one object. */
export async function storageUpload(bucket, path, bytes, contentType) {
  await request(`/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { 'Content-Type': contentType, 'x-upsert': 'true' },
    body: bytes,
  });
}

export { fail };
