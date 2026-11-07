<script lang="ts">
	import HomeAwayBadge from '#lib/components/HomeAwayBadge.svelte';
	import { firstName, formatMatchTime, translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

{#if !data.events}
	<h1>{t('me.title')}</h1>
	<p>{t('me.noLink')}</p>
{:else}
	<h1>{t('me.hello', { name: firstName(data.events.name) })}</h1>
	<h2>{t('me.upcoming')}</h2>
	{#if data.events.matches.length === 0}
		<p>{t('calendar.empty')}</p>
	{:else}
		<ul class="events">
			{#each data.events.matches as match (match.id)}
				<li>
					<a class="event" href="/{data.club.slug}/matches/{match.id}">
						<time datetime={match.startsAt}>{formatMatchTime(match.startsAt, data.locale, data.club.timeZone)}</time>
						<span class="team">{t('match.team', { team: match.team.name })}</span>
						<span>{t('match.versus', { opponent: match.opponent })}</span>
						<HomeAwayBadge isHome={match.isHome} locale={data.locale} />
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<style>
	.events {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	.event {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		align-items: center;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		color: inherit;
		text-decoration: none;
	}
	time {
		font-weight: 600;
		width: 100%;
	}
	.team {
		font-weight: 600;
	}
</style>
