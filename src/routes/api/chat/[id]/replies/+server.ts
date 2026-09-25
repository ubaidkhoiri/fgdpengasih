import { json } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { getAdminCode, verifyAdminToken } from '$lib/server/db/admin';
import { chatLikes, chatMessages } from '$lib/server/db/schema';

export async function GET({ platform, params, request }) {
	let db;
	try {
		db = getDb(platform);
	} catch (e) {
		return json(
			{ error: e instanceof Error ? e.message : 'database belum dikonfigurasi' },
			{ status: 503 }
		);
	}
	const id = params.id;
	const isAdmin = await verifyAdminToken(
		request.headers.get('x-admin-token') ?? '',
		getAdminCode(platform)
	);
	const parent = await db
		.select({ id: chatMessages.id })
		.from(chatMessages)
		.where(isAdmin ? eq(chatMessages.id, id) : and(eq(chatMessages.id, id), eq(chatMessages.isHidden, false)));
	if (!parent.length) return json({ error: 'pesan tidak ada' }, { status: 404 });
	const rows = await db
		.select()
		.from(chatMessages)
		.where(
			isAdmin
				? eq(chatMessages.parentId, id)
				: and(eq(chatMessages.parentId, id), eq(chatMessages.isHidden, false))
		)
		.orderBy(asc(chatMessages.createdAt))
		.limit(20);
	const deviceKey = request.headers.get('x-device-key') ?? '';
	const liked = new Set<string>();
	if (deviceKey && rows.length) {
		const lk = await db
			.select({ messageId: chatLikes.messageId })
			.from(chatLikes)
			.where(
				and(
					eq(chatLikes.deviceKey, deviceKey),
					inArray(
						chatLikes.messageId,
						rows.map((r) => r.id)
					)
				)
			);
		for (const r of lk) liked.add(r.messageId);
	}
	return json({
		replies: rows.map((m) => ({
			id: m.id,
			parentId: m.parentId,
			body: m.body,
			likes: m.likes,
			createdAt: m.createdAt,
			isHidden: m.isHidden,
			replyCount: 0,
			likedByMe: liked.has(m.id),
			mine: deviceKey !== '' && m.deviceKey === deviceKey
		}))
	});
}
