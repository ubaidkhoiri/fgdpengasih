import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env as privateEnv } from '$env/dynamic/private';

export type Db = ReturnType<typeof getDb>;

export function getDb(platform?: Readonly<App.Platform | undefined>) {
	const fromCf = (platform?.env as unknown as Record<string, string | undefined> | undefined)?.[
		'DATABASE_URL'
	];
	const url = fromCf ?? privateEnv['DATABASE_URL'];
	if (!url || url === 'PASTE_DATABASE_URL_DISINI') throw new Error('DATABASE_URL belum diset');
	return drizzle(neon(url));
}
