<script lang="ts">
	import HomeAwayBadge from '#lib/components/HomeAwayBadge.svelte';
	import AnswerButtons from '#lib/components/AnswerButtons.svelte';
	import { mapLinks } from '#lib/maps.js';
	import { formatClockTime, formatMatchDay, translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
	const match = $derived(data.match);
	const tz = $derived(data.club.timeZone);
	const maps = $derived(mapLinks(match.venue.address));
</script>

<svelte:head>
	<title>{t('match.team', { team: match.team.name })} {t('match.versus', { opponent: match.opponent })}</title>
</svelte:head>

<p><a href="/{data.club.slug}">{t('match.back')}</a></p>

<h1>
	{t('match.team', { team: match.team.name })}
	<span class="versus">{t('match.versus', { opponent: match.opponent })}</span>
</h1>
<p>
	<HomeAwayBadge isHome={match.isHome} locale={data.locale} />
</p>

<dl>
	<dt>{t('match.when')}</dt>
	<dd>
		<time datetime={match.startsAt}>
			{formatMatchDay(match.startsAt, data.locale, tz)}<br />
			<strong class="time">{formatClockTime(match.startsAt, data.locale, tz)}</strong>
		</time>
		{#if match.endsAt}
			<span class="until">{t('match.until', { time: formatClockTime(match.endsAt, data.locale, tz) })}</span>
		{/if}
	</dd>

	<dt>{t('match.where')}</dt>
	<dd>
		<strong>{match.venue.name}</strong><br />
		<address>{match.venue.address}</address>
	</dd>

	{#if match.competition}
		<dt>{t('match.competition')}</dt>
		<dd>{match.competition}</dd>
	{/if}
</dl>

{#if data.canAnswer}
	<h2>{t('answer.question')}</h2>
	<AnswerButtons matchId={match.id} current={data.myAnswer} locale={data.locale} />
{/if}

{#if data.responses}
	{@const r = data.responses}
	<h2>{t('responses.title')}</h2>
	<dl class="responses">
		{#each [['yes', r.yes], ['maybe', r.maybe], ['no', r.no], ['unanswered', r.unanswered]] as const as [key, list] (key)}
			<dt class={key}>{t(`responses.${key}`, { count: String(list.length) })}</dt>
			<dd>
				{#each list as m, i (m.id)}{i > 0 ? ', ' : ''}{m.name}{#if m.fromOtherTeam && m.team}
						<span class="sub">({m.team.name})</span>{/if}{:else}–{/each}
			</dd>
		{/each}
	</dl>
{/if}

<h2>{t('match.openInMaps')}</h2>
<p class="maps">
	<a class="button" href={maps.mapyCz} target="_blank" rel="noopener noreferrer">Mapy.cz</a>
	<a class="button" href={maps.googleMaps} target="_blank" rel="noopener noreferrer">Google Maps</a>
</p>

<style>
	h1 {
		margin-bottom: 0.25rem;
	}
	.versus {
		display: block;
		font-weight: 400;
		font-size: 1.25rem;
	}
	dl {
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	dt {
		color: #555;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	dt:not(:first-child) {
		margin-top: 0.75rem;
	}
	dd {
		margin: 0;
	}
	.time {
		font-size: 1.5rem;
	}
	.until {
		color: #555;
	}
	address {
		font-style: normal;
	}
	h2 {
		font-size: 1.125rem;
	}
	.responses dt {
		text-transform: none;
		letter-spacing: 0;
		font-weight: 700;
		font-size: 1rem;
	}
	.responses .yes {
		color: #15803d;
	}
	.responses .maybe {
		color: #a16207;
	}
	.responses .no {
		color: #b91c1c;
	}
	.sub {
		color: #555;
	}
	.maps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	.button {
		display: inline-flex;
		align-items: center;
		min-height: 48px;
		padding: 0 1.25rem;
		border-radius: 0.5rem;
		background: #1d4ed8;
		color: #fff;
		text-decoration: none;
		font-weight: 600;
	}
</style>
