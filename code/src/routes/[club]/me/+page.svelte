<script lang="ts">
	import AnswerButtons from '#lib/components/AnswerButtons.svelte';
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
	{@const events = data.events}
	<h1>{t('me.hello', { name: firstName(events.name) })}</h1>
	{#if events.unansweredMyTeam > 0}
		<p class="notice">{t('me.unansweredCount', { count: String(events.unansweredMyTeam) })}</p>
	{/if}

	{#snippet list(matches: typeof events.matches)}
		<ul class="events">
			{#each matches as match (match.id)}
				<li class="event" class:unanswered={match.isMyTeam && !match.myAnswer}>
					<a class="details" href="/{data.club.slug}/matches/{match.id}">
						<time datetime={match.startsAt}>{formatMatchTime(match.startsAt, data.locale, data.club.timeZone)}</time>
						{#if match.isMyTeam && !match.myAnswer}<span class="flag">{t('me.notAnswered')}</span>{/if}
						{#if match.inLineup}<span class="flag playing">{t('me.inLineup')}</span>{/if}
						<span class="what">
							<strong>{t('match.team', { team: match.team.name })}</strong>
							{t('match.versus', { opponent: match.opponent })}
						</span>
						<HomeAwayBadge isHome={match.isHome} locale={data.locale} />
					</a>
					<AnswerButtons matchId={match.id} current={match.myAnswer} locale={data.locale} />
				</li>
			{/each}
		</ul>
	{/snippet}

	{@const mine = events.matches.filter((m) => m.isMyTeam)}
	{@const others = events.matches.filter((m) => !m.isMyTeam)}
	{#if events.matches.length === 0}
		<p>{t('calendar.empty')}</p>
	{/if}
	{#if mine.length}
		<h2>{t('me.myTeam', { team: events.team?.name ?? '' })}</h2>
		{@render list(mine)}
	{/if}
	{#if others.length}
		<h2>{events.team ? t('me.otherTeams') : t('me.upcoming')}</h2>
		{#if events.team}<p class="hint">{t('me.otherTeamsHint')}</p>{/if}
		{@render list(others)}
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
		display: grid;
		gap: 0.5rem;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	.event.unanswered {
		border: 2px solid #1d4ed8;
	}
	.details {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		align-items: center;
		color: inherit;
		text-decoration: none;
	}
	time {
		font-weight: 600;
	}
	.what {
		width: 100%;
	}
	.flag.playing {
		background: #15803d;
	}
	.flag {
		background: #1d4ed8;
		color: #fff;
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.8rem;
		font-weight: 600;
	}
</style>
