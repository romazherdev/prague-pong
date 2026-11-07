<script lang="ts">
	import { formatMatchTime, translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{data.club.name}</h1>
<h2>{t('calendar.title')}</h2>

{#if data.matches.length === 0}
	<p>{t('calendar.empty')}</p>
{:else}
	<ul class="matches">
		{#each data.matches as match (match.id)}
			<li>
				<time datetime={match.startsAt}>{formatMatchTime(match.startsAt, data.locale, data.club.timeZone)}</time>
				<div class="teams">
					<span class="team">{t('match.team', { team: match.team.name })}</span>
					<span>{t('match.versus', { opponent: match.opponent })}</span>
				</div>
				<div class="where">
					<span class="badge" class:home={match.isHome}>{match.isHome ? t('match.home') : t('match.away')}</span>
					{match.venue.name}
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.matches {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	li {
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	time {
		font-weight: 600;
	}
	.teams {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.team {
		font-weight: 600;
	}
	.where {
		color: #555;
	}
	.badge {
		display: inline-block;
		padding: 0 0.5rem;
		border-radius: 999px;
		background: #eee;
		font-size: 0.875rem;
	}
	.badge.home {
		background: #dff3e4;
	}
</style>
