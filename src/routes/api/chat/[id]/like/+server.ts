import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { hitLimit } from '$lib/server/db/ratelimit';
import { chatLikes, chatMessages } from '$lib/server/db/schema';

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
	const deviceKey = (request.headers.get('x-device-key') ?? '').slice(0, 64);
	if (!deviceKey || deviceKey.length < 8)
		return json({ error: 'device key tidak valid' }, { status: 400 });
	const id = params.id;
	const msg = await db
		.select({ id: chatMessages.id, likes: chatMessages.likes })
		.from(chatMessages)
		.where(and(eq(chatMessages.id, id), eq(chatMessages.isHidden, false)));
	if (!msg.length) return json({ error: 'pesan tidak ada' }, { status: 404 });
	const lim = await hitLimit(db, deviceKey, 'chat-like-min', 10, 60);
	if (!lim.ok) return json({ error: 'kebanyakan like, tunggu sebentar' }, { status: 429 });
	const cond = and(eq(chatLikes.messageId, id), eq(chatLikes.deviceKey, deviceKey));
	const ex = await db.select().from(chatLikes).where(cond);
	if (ex.length) {
		await db.delete(chatLikes).where(cond);
		const likes = Math.max(0, msg[0].likes - 1);
		await db.update(chatMessages).set({ likes }).where(eq(chatMessages.id, id));
		return json({ liked: false, likes });
	}
	await db.insert(chatLikes).values({ messageId: id, deviceKey });
	const likes = msg[0].likes + 1;
	await db.update(chatMessages).set({ likes }).where(eq(chatMessages.id, id));
	return json({ liked: true, likes });
}
