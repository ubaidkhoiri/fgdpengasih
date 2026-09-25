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
		<section class="rday" aria-label="{day.day}, {day.date}">
			<h2 class="rhead">{day.day}<span>{day.date}</span></h2>
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
		padding: var(--spacing-2xs) var(--spacing-card) var(--spacing-m);
		color-scheme: light;
		background: var(--color-bg-base);
		color: var(--color-text-strong);
	}
	.rd::-webkit-scrollbar {
		display: none;
	}
	.rday {
		margin-top: var(--spacing-heading-before);
	}
	.rday:first-child {
		margin-top: var(--spacing-xs);
	}
	.rhead {
		margin: 0 0 var(--spacing-heading-after);
		font-size: var(--text-h2);
		line-height: var(--leading-h2);
		letter-spacing: -0.02em;
		color: var(--color-text-strong);
	}
	.rhead span {
		display: block;
		margin-top: var(--spacing-2xs);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		font-weight: 400;
		letter-spacing: 0;
		color: var(--color-text-weak);
	}
	.ritems {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.ritem {
		display: grid;
		grid-template-columns: 96px 18px 1fr;
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) 0;
	}
	.ritem + .ritem {
		border-top: 1px solid var(--color-stroke-weak);
	}
	.rtime {
		padding-top: var(--spacing-2xs);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--color-text-weak);
		font-feature-settings: var(--font-numeric-features);
	}
	.rrail {
		position: relative;
	}
	.rrail::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 8px;
		width: 8px;
		height: 8px;
		border-radius: var(--radius-full);
		background: var(--color-fill-brand);
		border: 2px solid var(--color-stroke-brand-strong);
	}
	.rrail::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 24px;
		bottom: -12px;
		width: 2px;
		background: var(--color-stroke-weak);
	}
	.ritem:last-child .rrail::after {
		display: none;
	}
	.rbody p {
		margin: 0;
		font-size: var(--text-body);
		line-height: var(--leading-body);
		color: var(--color-text-strong);
	}
	.rsub {
		margin-top: var(--spacing-2xs);
		padding-left: var(--spacing-xs);
		border-left: 2px solid var(--color-stroke-brand-weak);
		font-size: var(--text-caption);
		line-height: var(--leading-caption);
		color: var(--color-text-weak);
	}
</style>
