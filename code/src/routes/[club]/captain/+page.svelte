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
					{#if match.spotsOpen}<span class="spot-open">{t('spotOpen.label', { count: String(match.spotsOpen) })}</span>{/if}
					{#if match.needsAttention}<span class="attention">{t('lineup.needsAttention')}</span>{/if}
					<span class="answers">
						<span class="yes">{t('responses.yes', { count: String(match.answers.yes) })}</span>
						<span class="maybe">{t('responses.maybe', { count: String(match.answers.maybe) })}</span>
						<span class="no">{t('responses.no', { count: String(match.answers.no) })}</span>
						{#if match.answers.reconfirm}<span class="reconfirm">{t('responses.reconfirm', { count: String(match.answers.reconfirm) })}</span>{/if}
					</span>
					<span class="size" class:full={match.lineupSize === match.lineupMax}
						>{t('captain.lineupSize', { count: String(match.lineupSize), max: String(match.lineupMax) })}</span>
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
	.spot-open {
		background: #dc2626;
		color: #fff;
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 700;
	}
	.attention {
		background: #1d4ed8;
		color: #fff;
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
	}
	.answers {
		display: flex;
		gap: 0.75rem;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.answers .yes {
		color: #15803d;
	}
	.answers .maybe {
		color: #a16207;
	}
	.answers .reconfirm {
		color: #1d4ed8;
	}
	.answers .no {
		color: #b91c1c;
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
