import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db/client';
import { hitLimit } from '$lib/server/db/ratelimit';
import { chatMessages, chatReports } from '$lib/server/db/schema';

const REPORT_THRESHOLD = 5;

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
		.select({ id: chatMessages.id, reports: chatMessages.reports })
		.from(chatMessages)
		.where(eq(chatMessages.id, id));
	if (!msg.length) return json({ error: 'pesan tidak ada' }, { status: 404 });
	const cond = and(eq(chatReports.messageId, id), eq(chatReports.deviceKey, deviceKey));
	const ex = await db.select().from(chatReports).where(cond);
	if (ex.length) return json({ reported: true });
	const lim = await hitLimit(db, deviceKey, 'chat-report-day', 10, 86400);
	if (!lim.ok) return json({ error: 'batas laporan harian tercapai' }, { status: 429 });
	await db.insert(chatReports).values({ messageId: id, deviceKey });
	const reports = msg[0].reports + 1;
	const hidden = reports >= REPORT_THRESHOLD;
	await db
		.update(chatMessages)
		.set({ reports, isHidden: hidden })
		.where(eq(chatMessages.id, id));
	return json({ reported: true, hidden });
}
