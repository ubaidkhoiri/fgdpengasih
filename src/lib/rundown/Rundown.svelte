<script lang="ts">
	type Item = { t: string; d: string; sub?: string };
	type Day = { day: string; date: string; items: Item[] };

	const days: Day[] = [
		{
			day: 'Sabtu',
			date: '26 September 2026',
			items: [
				{ t: '16.00–18.00', d: 'Kedatangan, mendirikan tenda, snack berat' },
				{ t: '18.00–19.00', d: 'Magrib, pemantapan MM daerah, Isya' },
				{ t: '19.00–19.30', d: 'Persiapan acara' },
				{ t: '19.30–19.45', d: 'Penjelasan pemandu', sub: 'Husain Jodi' },
				{ t: '19.45–20.15', d: 'Diskusi per kelompok', sub: 'Panduan kertas tersedia' },
				{
					t: '20.15–21.00',
					d: 'Presentasi cepat per kelompok',
					sub: '2 orang per kelompok, @5 menit'
				},
				{
					t: '21.00–21.30',
					d: 'Diskusi acara desa 2027, semua MM boleh usul',
					sub: 'Pemancing, maju apresiasi, tulis kertas'
				},
				{ t: '21.30–23.00', d: 'Grill, 8 kelompok berhitung, beberes' },
				{
					t: '23.00–00.00',
					d: 'Acara bebas + diskusi pengurus MM desa dengan daerah bila perlu'
				}
			]
		},
		{
			day: 'Minggu',
			date: '27 September 2026',
			items: [
				{ t: '00.00–04.30', d: 'Istirahat + doa malam', sub: 'PJ: PA Ibnu, PI Yahya' },
				{ t: '04.30–05.15', d: 'Subuh + nasihat keimaman penutup' },
				{ t: '05.15–06.00', d: 'Foto bersama' },
				{ t: '06.00–07.00', d: 'Beberes + pulang' }
			]
		}
	];
</script>

<div class="rd">
	{#each days as day}
		<section class="rday">
			<header class="rhead"><strong>{day.day}</strong><span>{day.date}</span></header>
			<ol class="ritems">
				{#each day.items as it}
					<li class="ritem">
						<span class="rtime">{it.t}</span>
						<span class="rrail" aria-hidden="true"></span>
						<div class="rbody">
							<p>{it.d}</p>
							{#if it.sub}<p class="rsub">{it.sub}</p>{/if}
						</div>
					</li>
				{/each}
			</ol>
		</section>
	{/each}
</div>

<style>
	.rd {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		scrollbar-width: none;
		padding: 4px 18px 20px;
	}
	.rd::-webkit-scrollbar {
		display: none;
	}
	.rhead {
		position: sticky;
		top: 0;
		z-index: 2;
		background: #fff;
		padding: 10px 0 8px;
		border-bottom: 2px solid var(--green);
		margin-bottom: 4px;
	}
	.rhead strong {
		display: block;
		font-size: 20px;
		letter-spacing: -0.03em;
	}
	.rhead span {
		font-size: 13px;
		color: var(--muted);
		font-weight: 600;
	}
	.rday + .rday {
		margin-top: 14px;
	}
	.ritems {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ritem {
		display: grid;
		grid-template-columns: 92px 18px 1fr;
		gap: 8px;
		padding: 9px 0;
		position: relative;
	}
	.ritem + .ritem {
		border-top: 1px solid var(--line);
	}
	.rtime {
		font-size: 12px;
		font-weight: 800;
		color: var(--green);
		font-variant-numeric: tabular-nums;
		padding-top: 2px;
	}
	.rrail {
		position: relative;
	}
	.rrail::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 6px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--mint);
		border: 2px solid var(--green);
	}
	.rrail::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 20px;
		bottom: -12px;
		width: 2px;
		background: var(--line);
	}
	.ritem:last-child .rrail::after {
		display: none;
	}
	.rbody p {
		margin: 0;
		font-size: 14.5px;
		line-height: 1.5;
	}
	.rsub {
		margin-top: 3px;
		font-size: 12.5px;
		color: var(--muted);
		border-left: 2px solid var(--mint);
		padding-left: 8px;
	}
</style>
