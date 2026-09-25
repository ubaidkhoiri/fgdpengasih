<script lang="ts">
	import { DATA, type FgdEntry } from '$lib/fgd-data';

	let theme = $state('ALL');
	let q = $state('');
	let group = $state('ALL');
	let light = $state(false);
	let openIndex = $state<number | null>(null);
	let aboutOpen = $state(false);
	let copyLabel = $state('Salin seluruh detail');
	let searchEl: HTMLInputElement | null = $state(null);

	const themes = [...new Set(DATA.map((x) => x.theme))];
	const groups = [...new Set(DATA.map((x) => x.group))].sort((a, b) => a - b);
	const counts = themes.map((t) => [t, DATA.filter((x) => x.theme === t).length] as const);

	const KEEP = new Set([
		'BK', 'KMM', 'ORSENI', 'TENDIK', 'PPG', 'LUPG', 'GSM', 'GEMA',
		'WCO', 'FGD', 'IT', 'HP', 'SMP', 'SMA', 'SMK', 'PP', 'VIP'
	]);

	// Port verbatim dari displayText() di databasefgd.html.
	function displayText(value: string): string {
		const raw = String(value ?? '').replace(/\r/g, '').trim();
		if (!raw) return '';
		return raw
			.split('\n')
			.map((line) => {
				let t = line.trim();
				if (!t) return '';
				const upper = t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t);
				if (upper) {
					t = t.toLocaleLowerCase('id-ID');
					t = t.replace(/(^|[.!?]\s+)([a-zà-ÿ])/gu, (m, p, c) => p + c.toLocaleUpperCase('id-ID'));
					for (const k of KEEP) {
						const re = new RegExp('\\b' + k.toLocaleLowerCase('id-ID') + '\\b', 'giu');
						t = t.replace(re, k);
					}
					t = t.replace(
						/\b(bidang|nama kegiatan|peserta|waktu|dana|sasaran|penyebab|akar masalah|deskripsi|evaluasi|indikator keberhasilan|cara monitoring\/evaluasi|monitoring)\s*:/giu,
						(m, w) => w.replace(/^[a-z]/, (c: string) => c.toLocaleUpperCase('id-ID')) + ':'
					);
				}
				return t;
			})
			.join('\n');
	}

	const filtered = $derived.by(() => {
		let rows = DATA.filter((x) => theme === 'ALL' || x.theme === theme);
		if (group !== 'ALL') rows = rows.filter((x) => String(x.group) === group);
		if (q) {
			const needle = q.toLocaleLowerCase('id-ID');
			rows = rows.filter((x) =>
				(x.problem + ' ' + x.items.map((i) => i.solution + ' ' + i.actionPlan).join(' '))
					.toLocaleLowerCase('id-ID')
					.includes(needle)
			);
		}
		return rows;
	});

	const current: FgdEntry | null = $derived(openIndex === null ? null : (DATA[openIndex] ?? null));

	$effect(() => {
		document.body.classList.toggle('light', light);
	});
	$effect(() => {
		document.body.style.overflow = openIndex !== null || aboutOpen ? 'hidden' : '';
	});

	function onwindowkeydown(e: KeyboardEvent) {
		if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
			e.preventDefault();
			searchEl?.focus();
		}
		if (e.key === 'Escape') {
			openIndex = null;
			aboutOpen = false;
		}
	}

	function reset() {
		theme = 'ALL';
		q = '';
		group = 'ALL';
	}

	function openDetail(index: number) {
		copyLabel = 'Salin seluruh detail';
		openIndex = index;
	}

	async function copyDetail(x: FgdEntry) {
		const text = [
			'TEMA: ' + x.theme,
			'GRUP: ' + x.group + ' · NO: ' + x.no,
			'\nMASALAH\n' + x.problem,
			'\nSOLUSI\n' + x.items.map((i) => i.solution).join('\n'),
			'\nPROGRAM / ACTION PLAN\n' + x.items.map((i) => i.actionPlan).filter(Boolean).join('\n')
		].join('\n');
		try {
			await navigator.clipboard.writeText(text);
			copyLabel = 'Tersalin ✓';
			setTimeout(() => (copyLabel = 'Salin seluruh detail'), 1000);
		} catch {
			copyLabel = 'Gagal menyalin';
		}
	}
</script>

<svelte:window onkeydown={onwindowkeydown} />

<div class="app">
	<header class="top">
		<div class="bar">
			<div class="brand">
				<div class="mark">FG</div>
				<div>
					<h1>FGD Problem Bank</h1>
					<p>Panduan dan contoh dari dokumen sumber</p>
				</div>
			</div>
			<div class="tools">
				<button class="iconbtn" title="Mode tampilan" aria-label="Mode tampilan" onclick={() => (light = !light)}>◐</button>
				<button class="iconbtn" title="Tentang" aria-label="Tentang" onclick={() => (aboutOpen = true)}>?</button>
			</div>
		</div>
	</header>

	<section class="hero">
		<div class="eyebrow">FGD · Database referensi</div>
		<h2>Temukan masalah, solusi, dan action plan dalam hitungan detik.</h2>
		<p>
			Bank contoh ini mempertahankan istilah dan isi dari PDF sumber. Gunakan sebagai bahan membaca
			pola, memantik diskusi, lalu menyusun hasil FGD.
		</p>
		<div class="stats">
			{#each counts as [t, n]}
				<span class="pill">{t} · {n} grup</span>
			{/each}
			<span class="pill">{DATA.length} total</span>
		</div>
	</section>

	<section class="controls">
		<label class="search">
			<span>⌕</span>
			<input
				bind:this={searchEl}
				bind:value={q}
				placeholder="Cari masalah, solusi, nama kegiatan, bidang…"
				autocomplete="off"
				aria-label="Cari"
			/>
		</label>
		<select bind:value={group} aria-label="Pilih grup">
			<option value="ALL">Semua grup</option>
			{#each groups as g}
				<option value={String(g)}>Grup {g}</option>
			{/each}
		</select>
		<button class="ghost" onclick={reset}>Reset</button>
	</section>

	<nav class="tabs" aria-label="Tema">
		<button class="tab" class:active={theme === 'ALL'} onclick={() => (theme = 'ALL')}>Semua</button>
		{#each themes as t}
			<button class="tab" class:active={theme === t} onclick={() => (theme = t)}>{t}</button>
		{/each}
	</nav>

	<main class="main">
		<div class="resultbar">
			<span aria-live="polite">{filtered.length} contoh ditemukan</span>
			<span><span class="kbd">/</span> fokus cari</span>
		</div>
		<section class="grid">
			{#if filtered.length}
				{#each filtered as x}
					<article
						class="card"
						tabindex="0"
						onclick={() => openDetail(DATA.indexOf(x))}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								openDetail(DATA.indexOf(x));
							}
						}}
					>
						<div class="cardhead">
							<div class="cardmeta">
								<div class="tag">{x.theme}</div>
								<div class="num">GRUP {x.group} · NO {x.no}</div>
							</div>
							<div class="problem">{displayText(x.problem)}</div>
							<div class="hint"><span>{x.items.length} pembahasan</span><span class="arrow">↗</span></div>
						</div>
					</article>
				{/each}
			{:else}
				<div class="empty">Tidak ada contoh yang cocok.<br /><small>Coba kata kunci lain atau reset filter.</small></div>
			{/if}
		</section>
	</main>

	<footer class="footer">
		Sumber: 3 PDF FGD yang diunggah pada percakapan ini. Teks ditampilkan sebagai referensi sumber;
		tidak ditambahkan penilaian atau rekomendasi baru.
	</footer>

	{#if current || aboutOpen}
		<div
			class="modal open"
			role="dialog"
			aria-modal="true"
			onclick={(e) => {
				if (e.target === e.currentTarget) {
					openIndex = null;
					aboutOpen = false;
				}
			}}
			onkeydown={(e) => {
				if (e.key === 'Escape') {
					openIndex = null;
					aboutOpen = false;
				}
			}}
			tabindex="-1"
		>
			<div class="modalbox">
				{#if current}
					{@const x = current}
					<div class="modalhead">
						<div class="modalmeta"><span>{x.theme}</span><span>·</span><span>GRUP {x.group} · NO {x.no}</span></div>
						<button class="iconbtn close" aria-label="Tutup" onclick={() => (openIndex = null)}>✕</button>
					</div>
					<div class="detailgrid">
						<section class="lane">
							<div class="lanehead"><span>Masalah</span><span>01</span></div>
							<div class="lanecontent"><div class="textblock">{displayText(x.problem)}</div></div>
						</section>
						<section class="lane">
							<div class="lanehead"><span>Solusi</span><span>{String(x.items.length).padStart(2, '0')}</span></div>
							<div class="lanecontent">
								{#each x.items as it, i}
									<div class="solitem">
										<div class="soltitle">Solusi {i + 1}</div>
										<div class="soltext">{displayText(it.solution)}</div>
									</div>
								{/each}
							</div>
						</section>
						<section class="lane">
							<div class="lanehead">
								<span>Program / Action Plan</span><span>{String(x.items.filter((i) => i.actionPlan).length).padStart(2, '0')}</span>
							</div>
							<div class="lanecontent">
								{#each x.items as it, i}
									{#if it.actionPlan}
										<div class="solitem">
											<div class="soltitle">Untuk solusi {i + 1}</div>
											<div class="actiontext">{displayText(it.actionPlan)}</div>
										</div>
									{/if}
								{:else}
									<div class="actiontext">Tidak ada teks action plan pada bagian ini.</div>
								{/each}
							</div>
						</section>
					</div>
					<div class="detailfoot">
						<button class="copyall" onclick={() => current && copyDetail(current)}>{copyLabel}</button>
					</div>
				{:else}
					<div class="modalhead">
						<div class="modalmeta">FGD · Database referensi</div>
						<h3>Petunjuk penggunaan</h3>
						<button class="iconbtn close" aria-label="Tutup" onclick={() => (aboutOpen = false)}>✕</button>
					</div>
					<div class="detailgrid">
						<section class="lane">
							<div class="lanehead"><span>01 · Cari</span></div>
							<div class="lanecontent">
								<div class="textblock">
									Gunakan pencarian untuk menemukan contoh berdasarkan masalah, solusi, nama kegiatan,
									bidang, peserta, waktu, atau dana.
								</div>
							</div>
						</section>
						<section class="lane">
							<div class="lanehead"><span>02 · Pilih</span></div>
							<div class="lanecontent">
								<div class="textblock">Card utama dibuat ringkas. Klik satu card untuk membuka pembahasan lengkap.</div>
							</div>
						</section>
						<section class="lane">
							<div class="lanehead"><span>03 · Bandingkan</span></div>
							<div class="lanecontent">
								<div class="textblock">
									Detail ditampilkan sebagai tiga kolom: Masalah → Solusi → Program / Action Plan. Kolom
									tidak dapat dipindahkan.
								</div>
							</div>
						</section>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<svelte:head>
<style>
	*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#090b0f;color:#edf1f5;line-height:1.55}button,input,select{font:inherit}button{cursor:pointer}.app{min-height:100vh}.top{position:sticky;top:0;z-index:30;background:rgba(9,11,15,.84);backdrop-filter:blur(18px);border-bottom:1px solid #20252d}.bar{max-width:1240px;margin:auto;padding:14px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px}.brand{display:flex;align-items:center;gap:11px}.mark{width:36px;height:36px;border-radius:10px;background:#f4f6f8;color:#090b0f;display:grid;place-items:center;font-size:12px;font-weight:950}.brand h1{font-size:14px;margin:0;letter-spacing:-.01em}.brand p{font-size:11px;color:#7f8995;margin:1px 0 0}.tools{display:flex;gap:7px}.iconbtn,.ghost{border:1px solid #292f38;background:#11151b;color:#dce2e8;border-radius:10px;padding:8px 10px}.hero{max-width:1240px;margin:auto;padding:34px 22px 18px}.eyebrow{font-size:10px;color:#7f8995;text-transform:uppercase;letter-spacing:.16em;font-weight:850}.hero h2{font-size:clamp(27px,4.5vw,48px);line-height:1.05;letter-spacing:-.045em;margin:9px 0 11px;max-width:760px}.hero p{color:#98a2ad;max-width:720px;margin:0;font-size:13px}.stats{display:flex;flex-wrap:wrap;gap:7px;margin-top:17px}.pill{border:1px solid #252b33;background:#10141a;padding:6px 9px;border-radius:999px;font-size:10px;color:#aeb7c1}.controls{max-width:1240px;margin:auto;padding:12px 22px 10px;display:grid;grid-template-columns:minmax(0,1fr) 180px auto;gap:8px}.search{position:relative}.search input{width:100%;padding:12px 14px 12px 38px;border:1px solid #292f38;background:#10141a;color:#fff;border-radius:11px;outline:none}.search input:focus{border-color:#697482;box-shadow:0 0 0 3px rgba(255,255,255,.045)}.search span{position:absolute;left:13px;top:9px;color:#7e8995;font-size:18px}.controls select{padding:11px 12px;border:1px solid #292f38;background:#10141a;color:#dce2e8;border-radius:11px;outline:none}.tabs{max-width:1240px;margin:auto;padding:0 22px 13px;display:flex;gap:6px;overflow:auto;scrollbar-width:none}.tabs::-webkit-scrollbar{display:none}.tab{white-space:nowrap;border:1px solid #252b33;background:#0f1318;color:#9fa9b4;padding:8px 11px;border-radius:9px;font-size:11px}.tab.active{background:#edf1f5;color:#090b0f;border-color:#edf1f5;font-weight:850}.main{max-width:1240px;margin:auto;padding:0 22px 45px}.resultbar{display:flex;justify-content:space-between;gap:10px;align-items:center;color:#7f8995;font-size:11px;margin:3px 0 11px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.card{border:1px solid #232932;background:#0f1318;border-radius:14px;min-height:125px;display:flex;flex-direction:column;transition:transform .16s,border-color .16s,background .16s;cursor:pointer}.card:hover{transform:translateY(-2px);border-color:#3a424d;background:#11161c}.cardhead{padding:14px 14px 13px;display:flex;flex-direction:column;justify-content:space-between;gap:16px;height:100%}.cardmeta{display:flex;justify-content:space-between;gap:10px;align-items:center}.tag{font-size:9px;font-weight:850;letter-spacing:.1em;text-transform:uppercase;color:#89939f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.num{font-size:9px;color:#626d79;white-space:nowrap}.problem{font-size:14px;font-weight:720;line-height:1.42;letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}.hint{display:flex;align-items:center;justify-content:space-between;color:#65707c;font-size:10px;margin-top:2px}.arrow{font-size:14px}.empty{border:1px dashed #2b323b;border-radius:13px;padding:40px;text-align:center;color:#89939f;grid-column:1/-1}.footer{max-width:1240px;margin:auto;padding:0 22px 28px;color:#626d79;font-size:10px}.modal{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;z-index:60;padding:14px}.modal.open{display:flex;align-items:flex-end;justify-content:center}.modalbox{width:min(1180px,100%);max-height:94vh;overflow:auto;background:#0e1217;border:1px solid #303741;border-radius:18px 18px 12px 12px;box-shadow:0 25px 80px rgba(0,0,0,.55);animation:up .18s ease-out}@keyframes up{from{transform:translateY(12px);opacity:.5}to{transform:none;opacity:1}}.modalhead{position:sticky;top:0;z-index:2;background:rgba(14,18,23,.94);backdrop-filter:blur(15px);border-bottom:1px solid #242b34;padding:17px 18px 14px}.modalmeta{display:flex;gap:7px;align-items:center;color:#7e8995;font-size:10px}.modalhead h3{font-size:21px;line-height:1.25;letter-spacing:-.025em;margin:7px 0 0;max-width:900px}.close{position:absolute;right:14px;top:13px}.detailgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:14px}.lane{border:1px solid #252c35;background:#0a0e13;border-radius:13px;min-width:0}.lanehead{padding:11px 12px;border-bottom:1px solid #232a33;display:flex;align-items:center;justify-content:space-between}.lanehead span:first-child{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#8d97a2}.lanehead span:last-child{font-size:9px;color:#596470}.lanecontent{padding:12px}.textblock{font-size:13px;color:#dce2e8;white-space:pre-wrap;overflow-wrap:anywhere}.textblock+.textblock{margin-top:13px;padding-top:13px;border-top:1px dashed #252c35}.solitem{padding:0}.solitem+.solitem{margin-top:14px;padding-top:14px;border-top:1px dashed #252c35}.soltitle{font-size:10px;color:#77828e;text-transform:uppercase;letter-spacing:.1em;font-weight:850;margin-bottom:6px}.soltext{font-size:13px;color:#e7ebef;white-space:pre-wrap;overflow-wrap:anywhere}.actiontext{font-size:12.5px;color:#b8c1cb;white-space:pre-wrap;overflow-wrap:anywhere}.actiontext strong{color:#e7ebef}.detailfoot{display:flex;justify-content:flex-end;padding:0 14px 14px}.copyall{border:1px solid #303741;background:#171c23;color:#e5e9ed;border-radius:9px;padding:8px 11px;font-size:11px}.light{color-scheme:light;background:#f4f6f8;color:#14181d}.light .top{background:rgba(244,246,248,.88);border-color:#dce1e6}.light .mark{background:#151a20;color:#fff}.light .brand p,.light .hero p,.light .resultbar,.light .footer{color:#66717d}.light .pill,.light .tab,.light .search input,.light .controls select,.light .card,.light .iconbtn,.light .ghost{background:#fff;border-color:#dce1e6;color:#1b222a}.light .tab.active{background:#151a20;color:#fff;border-color:#151a20}.light .card:hover{background:#fff;border-color:#c5ccd4}.light .tag{color:#697480}.light .problem{color:#151a20}.light .num{color:#7a8590}.light .modalbox{background:#fff;border-color:#dce1e6}.light .modalhead{background:rgba(255,255,255,.94);border-color:#e0e5e9}.light .lane{background:#f8fafb;border-color:#dce1e6}.light .lanehead{border-color:#e0e5e9}.light .textblock,.light .soltext{color:#182028}.light .actiontext{color:#59646f}.light .solitem+.solitem,.light .textblock+.textblock{border-color:#dfe4e8}@media(max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:760px){.bar{padding:13px 14px}.hero{padding:27px 14px 16px}.controls{padding:9px 14px 10px;grid-template-columns:1fr auto}.search{grid-column:1/-1}.tabs{padding:0 14px 12px}.main{padding:0 14px 38px}.grid{grid-template-columns:1fr}.footer{padding:0 14px 24px}.brand p{display:none}.modal{padding:0}.modal.open{align-items:flex-end}.modalbox{max-height:96vh;border-radius:17px 17px 0 0}.modalhead{padding:16px 15px 13px}.modalhead h3{font-size:18px;padding-right:30px}.detailgrid{grid-template-columns:1fr;padding:10px}.lane{border-radius:11px}.lanehead{position:sticky;top:0;background:#0a0e13;z-index:1}.light .lanehead{background:#f8fafb}.detailfoot{padding:0 10px 10px}.copyall{width:100%}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
</style>
</svelte:head>

