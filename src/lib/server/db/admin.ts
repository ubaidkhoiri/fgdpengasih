import { env as privateEnv } from '$env/dynamic/private';

export function getAdminCode(platform?: Readonly<App.Platform | undefined>): string {
	const fromCf = (platform?.env as unknown as Record<string, string | undefined> | undefined)?.[
		'ADMIN_CODE'
	];
	return fromCf ?? privateEnv['ADMIN_CODE'] ?? '';
}

export function safeEqual(a: string, b: string): boolean {
	if (!a || !b || a.length !== b.length) return false;
	let d = 0;
	for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return d === 0;
}

async function hmacKey(code: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(`fgd-admin:${code}`),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
}

function toHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function signAdminToken(
	code: string,
	ttlSec = 43200
): Promise<{ token: string; expiresAt: number }> {
	const exp = Math.floor(Date.now() / 1000) + ttlSec;
	const mac = toHex(
		await crypto.subtle.sign('HMAC', await hmacKey(code), new TextEncoder().encode(String(exp)))
	);
	return { token: `${exp}.${mac}`, expiresAt: exp * 1000 };
}

export async function verifyAdminToken(token: string, code: string): Promise<boolean> {
	if (!code || !token) return false;
	const [expS, mac] = token.split('.');
	const exp = Number(expS);
	if (!expS || !mac || !Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
	const expect = toHex(
		await crypto.subtle.sign('HMAC', await hmacKey(code), new TextEncoder().encode(expS))
	);
	return safeEqual(expect, mac);
}
