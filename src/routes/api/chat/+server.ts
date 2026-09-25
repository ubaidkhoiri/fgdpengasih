import { json } from '@sveltejs/kit';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { hitLimit } from '$lib/server/db/ratelimit';
import { containsProfanity } from '$lib/server/db/profanity';
import { chatLikes, chatMessages } from '$lib/server/db/schema';

function noDb(e: unknown) {
	return json({ error: e instanceof Error ? e.message : 'database belum dikonfigurasi' }, { status: 503 });
}

export async function GET({ url, platform, request }) {
	let db;
	try {
		db = getDb(platform);
	} catch (e) {
		return noDb(e);
	}
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 30), 1), 50);
	const cursorRaw = url.searchParams.get('cursor');
	const deviceKey = request.headers.get('x-device-key') ?? '';
	const conds = [eq(chatMessages.isHidden, false), isNull(chatMessages.parentId)];
	if (cursorRaw) {
		const d = new Date(cursorRaw);
		if (!isNaN(d.getTime())) conds.push(lt(chatMessages.createdAt, d));
	}
	const rows = await db
		.select()
		.from(chatMessages)
		.where(and(...conds))
		.orderBy(desc(chatMessages.createdAt))
		.limit(limit + 1);
	const page = rows.slice(0, limit);
	const ids = page.map((r) => r.id);
	const replyCounts: Record<string, number> = {};
	const liked = new Set<string>();
	if (ids.length) {
		const rc = await db
			.select({ parentId: chatMessages.parentId, n: sql<number>`count(*)::int` })
			.from(chatMessages)
			.where(inArray(chatMessages.parentId, ids))
			.groupBy(chatMessages.parentId);
		for (const r of rc) if (r.parentId) replyCounts[r.parentId] = r.n;
		if (deviceKey) {
			const lk = await db
				.select({ messageId: chatLikes.messageId })
				.from(chatLikes)
				.where(and(eq(chatLikes.deviceKey, deviceKey), inArray(chatLikes.messageId, ids)));
			for (const r of lk) liked.add(r.messageId);
		}
	}
	return json({
		messages: page.map((m) => ({
			...m,
			replyCount: replyCounts[m.id] ?? 0,
			likedByMe: liked.has(m.id)
		})),
		hasMore: rows.length > limit,
		nextCursor: page.length ? page[page.length - 1].createdAt.toISOString() : null
	});
}

export async function POST({ request, platform }) {
	let db;
	try {
		db = getDb(platform);
	} catch (e) {
		return noDb(e);
	}
	const deviceKey = (request.headers.get('x-device-key') ?? '').slice(0, 64);
	if (!deviceKey || deviceKey.length < 8)
		return json({ error: 'device key tidak valid' }, { status: 400 });
	let data: { body?: unknown; parentId?: unknown };
	try {
		data = await request.json();
	} catch {
		return json({ error: 'body tidak valid' }, { status: 400 });
	}
	const body = String(data?.body ?? '').trim();
	const parentId = data?.parentId ? String(data.parentId) : null;
	if (!body || body.length > 500)
		return json({ error: 'pesan wajib 1 sampai 500 karakter' }, { status: 400 });
	if (containsProfanity(body))
		return json({ error: 'bahasa tidak pantas, jaga ucapan' }, { status: 400 });
	if (parentId) {
		const p = await db
			.select({ id: chatMessages.id, parentId: chatMessages.parentId })
			.from(chatMessages)
			.where(and(eq(chatMessages.id, parentId), eq(chatMessages.isHidden, false)));
		if (!p.length) return json({ error: 'pesan asal tidak ada' }, { status: 404 });
		if (p[0].parentId) return json({ error: 'balasan berlapis tidak didukung' }, { status: 400 });
	}
	const rules: Array<[string, number, number, string]> = [
		['chat-send-10s', 1, 10, 'terlalu cepat, tunggu sebentar'],
		['chat-send-hour', 20, 3600, 'batas 20 pesan per jam tercapai'],
		['chat-send-day', 200, 86400, 'batas 200 pesan per hari tercapai']
	];
	for (const [action, limit, win, msg] of rules) {
		const r = await hitLimit(db, deviceKey, action, limit, win);
		if (!r.ok) return json({ error: msg }, { status: 429 });
	}
	const inserted = await db
		.insert(chatMessages)
		.values({ body, parentId, deviceKey })
		.returning();
	return json(
		{ message: { ...inserted[0], replyCount: 0, likedByMe: false } },
		{ status: 201 }
	);
}
