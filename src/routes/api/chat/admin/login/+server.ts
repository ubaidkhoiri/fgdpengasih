import { json } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/client';
import { hitLimit } from '$lib/server/db/ratelimit';
import { getAdminCode, safeEqual, signAdminToken } from '$lib/server/db/admin';

export async function POST({ request, platform }) {
	let db;
	try {
		db = getDb(platform);
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'database belum dikonfigurasi' },
			{ status: 503 }
		);
	}
	const adminCode = getAdminCode(platform);
	if (!adminCode)
		return json({ error: 'admin belum dikonfigurasi' }, { status: 503 });
	const deviceKey = (request.headers.get('x-device-key') ?? 'web').slice(0, 64);
	const lim = await hitLimit(db, `admin-login:${deviceKey}`, 'admin-login', 10, 600);
	if (!lim.ok) return json({ error: 'kebanyakan percobaan, tunggu 10 menit' }, { status: 429 });
	let data: { code?: unknown };
	try {
		data = await request.json();
	} catch {
		return json({ error: 'body tidak valid' }, { status: 400 });
	}
	const code = String(data?.code ?? '').trim();
	if (!safeEqual(code, adminCode)) return json({ error: 'kode salah' }, { status: 401 });
	const { token, expiresAt } = await signAdminToken(adminCode);
	return json({ token, expiresAt });
}
