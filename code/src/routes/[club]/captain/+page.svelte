<script lang="ts">
	import HomeAwayBadge from '#lib/components/HomeAwayBadge.svelte';
	import { formatMatchTime, translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('captain.title')}</h1>

{#if data.matches.length === 0}
	<p>{t('calendar.empty')}</p>
{:else}
	<ul class="rows">
		{#each data.matches as match (match.id)}
			<li>
				<a class="row match" href="/{data.club.slug}/matches/{match.id}/lineup">
					<span class="when">{formatMatchTime(match.startsAt, data.locale, data.club.timeZone)}</span>
					<span class="what"><strong>{t('match.team', { team: match.team.name })}</strong> {t('match.versus', { opponent: match.opponent })}</span>
					<HomeAwayBadge isHome={match.isHome} locale={data.locale} />
					<span class="size" class:full={match.lineupSize === 4}>{t('captain.lineupSize', { count: String(match.lineupSize) })}</span>
				</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.match {
		color: inherit;
		text-decoration: none;
		align-items: center;
	}
	.when {
		font-weight: 600;
	}
	.what {
		width: 100%;
	}
	.size {
		margin-left: auto;
		font-weight: 700;
		color: #b45309;
	}
	.size.full {
		color: #15803d;
	}
</style>
