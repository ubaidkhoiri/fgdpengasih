import { and, eq, lt } from 'drizzle-orm';
import { rateWindows } from './schema';
import type { Db } from './client';

export async function hitLimit(
	db: Db,
	key: string,
	action: string,
	limit: number,
	windowSec: number
): Promise<{ ok: boolean; remaining: number }> {
	const now = new Date();
	await db
		.delete(rateWindows)
		.where(lt(rateWindows.windowStart, new Date(now.getTime() - 86400 * 1000)));
	const rows = await db
		.select()
		.from(rateWindows)
		.where(and(eq(rateWindows.deviceKey, key), eq(rateWindows.action, action)));
	const row = rows[0];
	if (!row || now.getTime() - row.windowStart.getTime() > windowSec * 1000) {
		await db
			.insert(rateWindows)
			.values({ deviceKey: key, action, count: 1, windowStart: now })
			.onConflictDoUpdate({
				target: [rateWindows.deviceKey, rateWindows.action],
				set: { count: 1, windowStart: now }
			});
		return { ok: true, remaining: limit - 1 };
	}
	if (row.count >= limit) return { ok: false, remaining: 0 };
	await db
		.update(rateWindows)
		.set({ count: row.count + 1 })
		.where(and(eq(rateWindows.deviceKey, key), eq(rateWindows.action, action)));
	return { ok: true, remaining: limit - row.count - 1 };
}
