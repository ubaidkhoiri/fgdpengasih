<script lang="ts">
	import { onMount } from 'svelte';

	let { adminUnlock = false }: { adminUnlock?: boolean } = $props();

	type Msg = {
		id: string;
		parentId: string | null;
		body: string;
		likes: number;
		createdAt: string;
		replyCount: number;
		likedByMe: boolean;
		mine: boolean;
		isHidden?: boolean;
		pending?: boolean;
	};

	type ApiBody = {
		error?: string;
		message?: Msg;
		messages?: Msg[];
		replies?: Msg[];
		hasMore?: boolean;
		nextCursor?: string | null;
		liked?: boolean;
		likes?: number;
		reported?: boolean;
		hidden?: boolean;
		id?: string;
		token?: string;
		expiresAt?: number;
	};

	const DEVICE_LS = 'fgd-chat-device';
	const DRAFT_LS = 'fgd-chat-draft';
	const ADMIN_LS = 'fgd-chat-admin';
	const POLL_MS = 5000;

	let msgs: Msg[] = $state([]);
	let replies: Record<string, Msg[]> = $state({});
	let replyDraft: Record<string, string> = $state({});
	let openThread: string | null = $state(null);
	let draft = $state('');
	let deviceKey = $state('');
	let loading = $state(true);
	let sending = $state(false);
	let loadingMore = $state(false);
	let err = $state('');
	let notice = $state('');
	let hasMore = $state(false);
	let nextCursor: string | null = $state(null);
	let dbDown = $state(false);
	let pollT = 0;
	let isAdmin = $state(false);
	let adminToken = $state('');
	let adminCode = $state('');
	let adminErr = $state('');

	function hdrs() {
		const h: Record<string, string> = {
			'content-type': 'application/json',
			'x-device-key': deviceKey
		};
		if (adminToken) h['x-admin-token'] = adminToken;
		return h;
	}

	function ago(iso: string) {
		const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
		if (s < 60) return 'baru saja';
		if (s < 3600) return `${Math.floor(s / 60)}mnt lalu`;
		if (s < 86400) return `${Math.floor(s / 3600)}jam lalu`;
		return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
	}

	function patchMsg(id: string, patch: Partial<Msg>) {
		msgs = msgs.map((m) => (m.id === id ? { ...m, ...patch } : m));
		for (const k of Object.keys(replies))
			replies[k] = replies[k].map((m) => (m.id === id ? { ...m, ...patch } : m));
	}

	async function load(initial = false) {
		try {
			const r = await fetch('/api/chat?limit=30');
			const j: ApiBody = await r.json();
			if (r.status === 503) {
				dbDown = true;
				return;
			}
			if (!r.ok) throw new Error(j.error ?? 'gagal memuat');
			dbDown = false;
			msgs = j.messages ?? [];
			hasMore = j.hasMore ?? false;
			nextCursor = j.nextCursor ?? null;
		} catch (e) {
			if (initial) err = e instanceof Error ? e.message : 'gagal memuat';
		} finally {
			if (initial) loading = false;
		}
	}

	async function poll() {
		if (document.hidden) return;
		try {
			const r = await fetch('/api/chat?limit=30');
			if (!r.ok) return;
			const j: ApiBody = await r.json();
			const fresh: Msg[] = j.messages ?? [];
			const known = new Set(msgs.map((m) => m.id));
			const freshById = new Map(fresh.map((m) => [m.id, m]));
			const added = fresh.filter((m) => !known.has(m.id));
			if (!added.length && !fresh.length) return;
			msgs = [...added, ...msgs.map((m) => freshById.get(m.id) ?? m)].slice(0, 100);
		} catch {
			/* diam, coba lagi interval berikut */
		}
	}

	async function loadMore() {
		if (!nextCursor || loadingMore) return;
		loadingMore = true;
		try {
			const r = await fetch(`/api/chat?limit=30&cursor=${encodeURIComponent(nextCursor)}`);
			const j: ApiBody = await r.json();
			if (!r.ok) throw new Error(j.error ?? 'gagal memuat');
			const known = new Set(msgs.map((m) => m.id));
			msgs = [...msgs, ...(j.messages ?? []).filter((m: Msg) => !known.has(m.id))];
			hasMore = j.hasMore ?? false;
			nextCursor = j.nextCursor ?? null;
		} catch (e) {
			err = e instanceof Error ? e.message : 'gagal memuat';
		} finally {
			loadingMore = false;
		}
	}

	async function send(parent: string | null, text: string) {
		const body = text.trim();
		if (!body || sending) return;
		err = '';
		notice = '';
		const tmp: Msg = {
			id: `tmp-${Math.random().toString(36).slice(2)}`,
			parentId: parent,
			body,
			likes: 0,
			createdAt: new Date().toISOString(),
			replyCount: 0,
			likedByMe: false,
			mine: true,
			pending: true
		};
		if (!parent) {
			msgs = [tmp, ...msgs];
			draft = '';
		} else {
			replies[parent] = [...(replies[parent] ?? []), tmp];
			replyDraft[parent] = '';
		}
		sending = true;
		try {
			const r = await fetch('/api/chat', {
				method: 'POST',
				headers: hdrs(),
				body: JSON.stringify({ body, parentId: parent })
			});
			const j: ApiBody = await r.json();
			if (!r.ok) throw new Error(j.error ?? 'gagal mengirim');
			const sent = j.message;
			if (!sent) throw new Error('respon server aneh');
			if (!parent) {
				msgs = msgs.map((m) => (m.id === tmp.id ? sent : m));
			} else {
				replies[parent] = (replies[parent] ?? []).map((m) =>
					m.id === tmp.id ? sent : m
				);
				msgs = msgs.map((m) =>
					m.id === parent ? { ...m, replyCount: m.replyCount + 1 } : m
				);
			}
		} catch (e) {
			if (!parent) msgs = msgs.filter((m) => m.id !== tmp.id);
			else {
				replies[parent] = (replies[parent] ?? []).filter((m) => m.id !== tmp.id);
				if (!parent) draft = body;
			}
			err = e instanceof Error ? e.message : 'gagal mengirim';
		} finally {
			sending = false;
		}
	}

	async function toggleLike(m: Msg) {
		if (m.pending || m.id.startsWith('tmp-')) return;
		const r = await fetch(`/api/chat/${m.id}/like`, { method: 'POST', headers: hdrs() });
		const j: ApiBody = await r.json();
		if (!r.ok) {
			err = j.error ?? 'gagal like';
			return;
		}
		patchMsg(m.id, { likes: j.likes ?? m.likes, likedByMe: j.liked ?? m.likedByMe });
	}

	async function toggleThread(m: Msg) {
		if (openThread === m.id) {
			openThread = null;
			return;
		}
		openThread = m.id;
		if (replies[m.id]) return;
		try {
			const r = await fetch(`/api/chat/${m.id}/replies`, { headers: hdrs() });
			const j: ApiBody = await r.json();
			if (!r.ok) throw new Error(j.error ?? 'gagal memuat balasan');
			replies[m.id] = j.replies ?? [];
		} catch (e) {
			err = e instanceof Error ? e.message : 'gagal memuat balasan';
		}
	}

	async function report(m: Msg) {
		if (m.pending || m.id.startsWith('tmp-')) return;
		const r = await fetch(`/api/chat/${m.id}/report`, { method: 'POST', headers: hdrs() });
		const j: ApiBody = await r.json();
		if (!r.ok) {
			err = j.error ?? 'gagal melapor';
			return;
		}
		if (j.hidden) {
			msgs = msgs.filter((x) => x.id !== m.id);
			notice = 'pesan disembunyikan setelah banyak laporan';
		} else notice = 'laporan dicatat, terima kasih sudah menjaga';
	}

	async function adminLogin() {
		const code = adminCode.trim();
		if (!code) return;
		adminErr = '';
		try {
			const r = await fetch('/api/chat/admin/login', {
				method: 'POST',
				headers: hdrs(),
				body: JSON.stringify({ code })
			});
			const j: ApiBody = await r.json();
			if (!r.ok) throw new Error(j.error ?? 'gagal masuk');
			if (!j.token) throw new Error('respon server aneh');
			adminToken = j.token;
			isAdmin = true;
			adminCode = '';
			try {
				sessionStorage.setItem(ADMIN_LS, adminToken);
			} catch {
				/* abaikan */
			}
			load(true);
		} catch (e) {
			adminErr = e instanceof Error ? e.message : 'gagal masuk';
		}
	}

	function adminLogout() {
		adminToken = '';
		isAdmin = false;
		try {
			sessionStorage.removeItem(ADMIN_LS);
		} catch {
			/* abaikan */
		}
		load(true);
	}

	async function toggleHide(m: Msg) {
		if (m.pending || m.id.startsWith('tmp-')) return;
		try {
			const r = await fetch(`/api/chat/${m.id}/hide`, {
				method: 'POST',
				headers: hdrs(),
				body: JSON.stringify({ hidden: !m.isHidden })
			});
			const j: ApiBody = await r.json();
			if (!r.ok) throw new Error(j.error ?? 'gagal menyembunyikan');
			patchMsg(m.id, { isHidden: j.hidden ?? !m.isHidden });
		} catch (e) {
			err = e instanceof Error ? e.message : 'gagal menyembunyikan';
		}
	}

	onMount(() => {
		let dk = '';
		try {
			dk = localStorage.getItem(DEVICE_LS) ?? '';
			if (!dk) {
				dk =
					typeof crypto !== 'undefined' && 'randomUUID' in crypto
						? crypto.randomUUID()
						: `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
				localStorage.setItem(DEVICE_LS, dk);
			}
			draft = localStorage.getItem(DRAFT_LS) ?? '';
		} catch {
			dk = `d-${Date.now()}-${Math.random().toString(36).slice(2)}`;
		}
		deviceKey = dk;
		try {
			const t = sessionStorage.getItem(ADMIN_LS) ?? '';
			const exp = Number(t.split('.')[0]);
			if (t && Number.isFinite(exp) && exp * 1000 > Date.now()) {
				adminToken = t;
				isAdmin = true;
			} else if (t) sessionStorage.removeItem(ADMIN_LS);
		} catch {
			/* abaikan */
		}
		load(true);
		pollT = window.setInterval(poll, POLL_MS);
		return () => window.clearInterval(pollT);
	});

	$effect(() => {
		try {
			localStorage.setItem(DRAFT_LS, draft);
		} catch {
			/* abaikan */
		}
	});
</script>

<div class="chat">
	<div class="pin" role="note">
		<strong>Perhatian, ruang anonim bersama.</strong>
		Jaga bahasa, dilarang menyakiti atau merendahkan siapa pun. Pesan yang dilaporkan 5 orang otomatis disembunyikan.
	</div>
	{#if adminUnlock && !isAdmin}
		<form
			class="adminbox"
			onsubmit={(e) => {
				e.preventDefault();
				adminLogin();
			}}
		>
			<input
				type="password"
				placeholder="Kode admin…"
				maxlength="64"
				autocomplete="off"
				bind:value={adminCode}
				aria-label="Kode admin"
			/>
			<button type="submit" disabled={!adminCode.trim()} aria-label="Masuk sebagai admin">
				Masuk
			</button>
		</form>
		{#if adminErr}
			<p class="err" role="alert">{adminErr}</p>
		{/if}
	{/if}
	{#if isAdmin}
		<div class="adminbar">
			<span>Mode admin aktif</span>
			<button type="button" onclick={adminLogout}>Keluar</button>
		</div>
	{/if}
	{#if dbDown}
		<div class="dbwarn">
			Database chat belum tersambung. Tempel DATABASE_URL Neon ke file .env lalu jalankan migrasi.
		</div>
	{/if}
	{#if loading}
		<p class="state">Memuat percakapan…</p>
	{:else if (!msgs.length)}
		<p class="state">Belum ada pesan. Jadilah yang pertama menyapa.</p>
	{:else}
		<ul class="list">
			{#each msgs as m (m.id)}
				<li class="bubble" class:mine={m.mine} class:pending={m.pending} class:hidden={m.isHidden}>
					{#if m.isHidden}<span class="tag-hidden">tersembunyi</span>{/if}
					<p class="body">{m.body}<span class="time">{ago(m.createdAt)}{#if m.mine}{#if m.pending}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>{:else}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12.5 7 17l4.5-4.5M7.5 12.5 12 17l9.5-9.5"/></svg>{/if}{/if}</span></p>
					<div class="meta">
						<button
							type="button"
							class="act"
							class:liked={m.likedByMe}
							onclick={() => toggleLike(m)}
							aria-label="Suka"
							aria-pressed={m.likedByMe}
						>
							<svg width="15" height="15" viewBox="0 0 24 24" fill={m.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>{m.likes}
						</button>
						<button type="button" class="act" onclick={() => toggleThread(m)} aria-expanded={openThread === m.id}>
							Balas{m.replyCount ? ` (${m.replyCount})` : ''}
						</button>
						<button type="button" class="act danger" onclick={() => report(m)} aria-label="Laporkan">
							Lapor
						</button>
						{#if isAdmin}
							<button type="button" class="act danger" onclick={() => toggleHide(m)}>
								{m.isHidden ? 'Tampilkan' : 'Sembunyikan'}
							</button>
						{/if}
					</div>
					{#if openThread === m.id}
						<div class="thread">
							{#each replies[m.id] ?? [] as r (r.id)}
								<div class="bubble sub" class:mine={r.mine} class:pending={r.pending} class:hidden={r.isHidden}>
									{#if r.isHidden}<span class="tag-hidden">tersembunyi</span>{/if}
									<p class="body">{r.body}<span class="time">{ago(r.createdAt)}{#if r.mine}{#if r.pending}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>{:else}<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12.5 7 17l4.5-4.5M7.5 12.5 12 17l9.5-9.5"/></svg>{/if}{/if}</span></p>
									<div class="meta">
										<button
											type="button"
											class="act"
											class:liked={r.likedByMe}
											onclick={() => toggleLike(r)}
											aria-label="Suka"
											aria-pressed={r.likedByMe}
										>
											<svg width="15" height="15" viewBox="0 0 24 24" fill={r.likedByMe ? 'currentColor' : 'none'} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"/></svg>{r.likes}
										</button>
										<button type="button" class="act danger" onclick={() => report(r)} aria-label="Laporkan">
											Lapor
										</button>
										{#if isAdmin}
											<button type="button" class="act danger" onclick={() => toggleHide(r)}>
												{r.isHidden ? 'Tampilkan' : 'Sembunyikan'}
											</button>
										{/if}
									</div>
								</div>
							{:else}
								<p class="state small">Belum ada balasan.</p>
							{/each}
							<form
								class="composer sub"
								onsubmit={(e) => {
									e.preventDefault();
									send(m.id, replyDraft[m.id] ?? '');
								}}
							>
								<input
									type="text"
									placeholder="Tulis balasan…"
									maxlength="500"
									bind:value={replyDraft[m.id]}
									aria-label="Tulis balasan"
								/>
								<button type="submit" disabled={sending || !(replyDraft[m.id] ?? '').trim()} aria-label="Kirim balasan">
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10z"/></svg>
								</button>
							</form>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if hasMore}
			<button type="button" class="more" onclick={loadMore} disabled={loadingMore}>
				{loadingMore ? 'Memuat…' : 'Muat yang lebih lama'}
			</button>
		{/if}
	{/if}
	{#if err}
		<p class="err" role="alert">{err}</p>
	{/if}
	{#if notice}
		<p class="notice" role="status">{notice}</p>
	{/if}
	<form
		class="composer"
		onsubmit={(e) => {
			e.preventDefault();
			send(null, draft);
		}}
	>
		<input
			type="text"
			placeholder="Tulis pesan anonim…"
			maxlength="500"
			bind:value={draft}
			aria-label="Tulis pesan anonim"
		/>
		<span class="count">{draft.length}/500</span>
		<button type="submit" disabled={sending || !draft.trim()} aria-label="Kirim pesan">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 3 10.5 13.5M21 3l-7 18-3.5-7.5L3 10z"/></svg>
		</button>
	</form>
</div>

<style>
	:global(.sheet.tall) {
		height: min(92dvh, 720px);
		max-height: 92dvh;
	}
	:global(.sheet.tall .sheet-body) {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		padding: 0;
	}
	.chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: #efeae2;
	}
	.pin {
		background: #fff8e6;
		border-bottom: 1px solid #f0dfae;
		color: #6b5518;
		font-size: 13px;
		line-height: 1.5;
		padding: 10px 16px;
	}
	.dbwarn {
		background: #fdecec;
		color: #8f1d1d;
		font-size: 13px;
		padding: 10px 16px;
		border-bottom: 1px solid #f3c2c2;
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 12px;
		overflow-y: auto;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bubble {
		background: #fff;
		border-radius: 8px;
		border-top-left-radius: 2px;
		padding: 6px 8px 5px;
		max-width: 82%;
		align-self: flex-start;
		box-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
	}
	.bubble.mine {
		background: #d9fdd3;
		align-self: flex-end;
		border-top-left-radius: 8px;
		border-top-right-radius: 2px;
	}
	.bubble.pending {
		opacity: 0.6;
	}
	.body {
		margin: 0;
		font-size: 14.2px;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}
	.time {
		float: right;
		font-size: 11px;
		line-height: 1;
		color: #667781;
		margin: 9px 0 0 8px;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		white-space: nowrap;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 2px;
		font-size: 11.5px;
		line-height: 1.2;
		color: #8696a0;
	}
	.act {
		background: none;
		border: 0;
		padding: 0 2px;
		margin: 0;
		color: #8696a0;
		font-size: 11.5px;
		line-height: 1.2;
		font-weight: 700;
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.act.liked {
		color: #00a884;
	}
	.act.danger {
		font-weight: 600;
	}
	.thread {
		margin-top: 6px;
		padding-top: 6px;
		border-top: 1px solid rgba(0, 0, 0, 0.12);
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bubble.sub {
		background: #f0f2f5;
		max-width: 100%;
		align-self: stretch;
		box-shadow: none;
	}
	.bubble.mine .bubble.sub {
		background: #cdebc7;
	}
	.state {
		text-align: center;
		color: var(--muted);
		font-size: 14px;
		padding: 24px 16px;
	}
	.state.small {
		padding: 4px 0;
	}
	.more {
		margin: 0 auto 12px;
		background: none;
		border: 1px solid var(--line);
		border-radius: 99px;
		padding: 8px 18px;
		font-size: 13px;
		font-weight: 700;
		color: var(--green);
		flex: none;
	}
	.err {
		color: #8f1d1d;
		background: #fdecec;
		font-size: 13px;
		margin: 0;
		padding: 8px 16px;
	}
	.notice {
		color: var(--green);
		background: var(--mint);
		font-size: 13px;
		margin: 0;
		padding: 8px 16px;
	}
	.composer {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
		border-top: 0;
		background: #f0f2f5;
		flex: none;
	}
	.composer.sub {
		padding: 0;
		border: 0;
		background: none;
	}
	.composer input {
		flex: 1;
		border: 0;
		border-radius: 20px;
		padding: 9px 14px;
		font-size: 14px;
		min-width: 0;
		background: #fff;
	}
	.composer input:focus {
		outline: 2px solid #00a884;
		outline-offset: -1px;
	}
	.count {
		font-size: 11px;
		color: var(--muted);
		flex: none;
	}
	.composer button[type='submit'] {
		flex: none;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		border: 0;
		background: #00a884;
		color: #fff;
		display: grid;
		place-items: center;
	}
	.composer button[type='submit']:disabled {
		opacity: 0.4;
	}
	.adminbox {
		display: flex;
		gap: 8px;
		padding: 10px 16px;
		background: #f4f4f2;
		border-bottom: 1px solid var(--line);
	}
	.adminbox input {
		flex: 1;
		border: 1px solid var(--line);
		border-radius: 99px;
		padding: 8px 14px;
		font-size: 14px;
		min-width: 0;
	}
	.adminbox button {
		border: 0;
		border-radius: 99px;
		background: var(--ink);
		color: #fff;
		font-size: 13px;
		font-weight: 800;
		padding: 8px 16px;
	}
	.adminbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		background: var(--ink);
		color: #fff;
		font-size: 13px;
		font-weight: 700;
	}
	.adminbar button {
		background: none;
		border: 1px solid #ffffff55;
		border-radius: 99px;
		color: #fff;
		font-size: 12px;
		font-weight: 700;
		padding: 4px 12px;
	}
	.bubble.hidden {
		border-style: dashed;
		opacity: 0.75;
	}
	.tag-hidden {
		display: inline-block;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: #8f1d1d;
		background: #fdecec;
		border-radius: 99px;
		padding: 2px 10px;
		margin-bottom: 6px;
	}
</style>
