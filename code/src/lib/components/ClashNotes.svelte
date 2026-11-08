<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';
	import type { EveningClash } from '#lib/server/core/clashes.js';

	let { clashes, locale }: { clashes: EveningClash[]; locale: Locale } = $props();
	const t = $derived(translator(locale));
</script>

{#if clashes.length}
	<ul class="clashes" role="status">
		{#each clashes as clash, i (i)}
			<li>
				⚠
				{#if clash.kind === 'tooFewTables'}
					{t('clash.tooFewTables', {
						matches: String(clash.homeMatches),
						needed: String(clash.tablesNeeded),
						total: String(clash.totalTables)
					})}
				{:else if clash.kind === 'trainingTables'}
					{t('clash.trainingTables', { free: String(clash.freeTables), min: String(clash.minTrainingTables) })}
				{:else}
					{t('clash.doubleBooked', { name: clash.member.name, matches: String(clash.matchIds.length) })}
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	.clashes {
		list-style: none;
		margin: 0;
		padding: 0.5rem 0.75rem;
		background: #fef2f2;
		border-radius: 0.375rem;
		color: #991b1b;
		font-size: 0.95rem;
		font-weight: 600;
	}
</style>
