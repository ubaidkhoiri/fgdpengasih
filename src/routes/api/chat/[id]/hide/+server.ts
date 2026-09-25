import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { getAdminCode, verifyAdminToken } from '$lib/server/db/admin';
import { chatMessages } from '$lib/server/db/schema';

export async function POST({ request, platform, params }) {
	let db;
	try {
		db = getDb(platform);
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'database belum dikonfigurasi' },
			{ status: 503 }
		);
	}
	const ok = await verifyAdminToken(
		request.headers.get('x-admin-token') ?? '',
		getAdminCode(platform)
	);
	if (!ok) return json({ error: 'akses ditolak' }, { status: 403 });
	let data: { hidden?: unknown };
	try {
		data = await request.json();
	} catch {
		return json({ error: 'body tidak valid' }, { status: 400 });
	}
	if (typeof data?.hidden !== 'boolean')
		return json({ error: 'hidden wajib boolean' }, { status: 400 });
	const id = params.id;
	const msg = await db
		.select({ id: chatMessages.id })
		.from(chatMessages)
		.where(eq(chatMessages.id, id));
	if (!msg.length) return json({ error: 'pesan tidak ada' }, { status: 404 });
	await db
		.update(chatMessages)
		.set({ isHidden: data.hidden })
		.where(eq(chatMessages.id, id));
	return json({ id, hidden: data.hidden });
}
