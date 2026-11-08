<script lang="ts">
	import ClashNotes from '#lib/components/ClashNotes.svelte';
	import HomeAwayBadge from '#lib/components/HomeAwayBadge.svelte';
	import SpotOpenBadge from '#lib/components/SpotOpenBadge.svelte';
	import { formatMatchTime, translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
	/** The calendar as evenings, each with its matches and its clashes. */
	const evenings = $derived(
		[...new Set([...data.matches.map((m) => m.evening), ...data.trainings.map((s) => s.evening)])].sort().map((date) => ({
			date,
			matches: data.matches.filter((m) => m.evening === date),
			trainings: data.trainings.filter((s) => s.evening === date),
			clashes: data.clashes.filter((c) => c.date === date)
		}))
	);

	/** Calendar URL keeping the current filters, with some of them changed. */
	function calendarHref(change: { team?: string | null; past?: boolean }): string {
		const team = change.team === undefined ? data.selectedTeam : change.team;
		const past = change.past ?? data.includePast;
		const params = new URLSearchParams();
		if (team) params.set('team', team);
		if (past) params.set('past', '1');
		const query = params.toString();
		return `/${data.club.slug}${query ? `?${query}` : ''}`;
	}
</script>

<h1>{data.club.name}</h1>
<h2>{t('calendar.title')}</h2>

<nav class="filters" aria-label={t('calendar.filterLabel')}>
	<span class="filter-label">{t('calendar.filterLabel')}:</span>
	<a class="chip" href={calendarHref({ team: null })} aria-current={data.selectedTeam === null ? 'page' : undefined}>
		{t('calendar.allTeams')}
	</a>
	{#each data.teams as team (team.id)}
		<a
			class="chip"
			href={calendarHref({ team: team.name })}
			aria-current={data.selectedTeam === team.name ? 'page' : undefined}
		>
			{team.name}
		</a>
	{/each}
</nav>

<p class="past-toggle">
	<a href={calendarHref({ past: !data.includePast })}>
		{data.includePast ? t('calendar.hidePast') : t('calendar.showPast')}
	</a>
</p>

{#if data.matches.length === 0 && data.trainings.length === 0}
	<p>{data.includePast ? t('calendar.emptyAll') : t('calendar.empty')}</p>
{:else}
	<div class="evenings">
		{#each evenings as evening (evening.date)}
			<section class="evening" class:clash={evening.clashes.length > 0}>
				<ClashNotes clashes={evening.clashes} locale={data.locale} />
				<ul class="matches">
					{#each evening.matches as match (match.id)}
						<li>
							<a class="match" href="/{data.club.slug}/matches/{match.id}">
								<time datetime={match.startsAt}>{formatMatchTime(match.startsAt, data.locale, data.club.timeZone)}</time>
								<div class="teams">
									<span class="team">{t('match.team', { team: match.team.name })}</span>
									<span>{t('match.versus', { opponent: match.opponent })}</span>
								</div>
								<div class="where">
									<HomeAwayBadge isHome={match.isHome} locale={data.locale} />
									{match.venue.name}
								</div>
								<SpotOpenBadge count={match.spotsOpen} locale={data.locale} />
							</a>
						</li>
					{/each}
					{#each evening.trainings as s (s.id)}
						<li>
							<a class="match training" class:cancelled={s.cancelled} href="/{data.club.slug}/trainings/{s.id}">
								<time datetime={s.startsAt}>{formatMatchTime(s.startsAt, data.locale, data.club.timeZone)}</time>
								<div class="teams"><span class="team">{t('training.title')}</span> <span>{s.venue.name}</span></div>
								<div class="where">
									{#if s.cancelled}<strong>{t('training.cancelledShort')}</strong>{:else}{t('training.coming', { count: String(s.coming) })}{/if}
								</div>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem;
	}
	.filter-label {
		color: #555;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0 1rem;
		border: 1px solid #c8c8c0;
		border-radius: 999px;
		background: #fff;
		color: inherit;
		text-decoration: none;
		font-weight: 600;
	}
	.chip[aria-current='page'] {
		background: #1a1a1a;
		border-color: #1a1a1a;
		color: #fff;
	}
	.past-toggle a {
		display: inline-block;
		padding: 0.5rem 0;
		color: #1d4ed8;
	}
	.matches {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.75rem;
	}
	.match {
		display: block;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		color: inherit;
		text-decoration: none;
	}
	.match.training {
		background: #f0fdf4;
	}
	.match.training.cancelled {
		background: #f5f5f4;
		text-decoration: line-through;
		color: #777;
	}
	.evenings {
		display: grid;
		gap: 0.75rem;
	}
	.evening.clash {
		display: grid;
		gap: 0.5rem;
		border: 2px solid #dc2626;
		border-radius: 0.75rem;
		padding: 0.5rem;
	}
	.evening .matches {
		margin: 0;
	}
	.match:hover,
	.match:focus-visible {
		border-color: #1a1a1a;
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
</style>
