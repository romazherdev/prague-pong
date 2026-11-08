<script lang="ts">
	import TrainingButtons from '#lib/components/TrainingButtons.svelte';
	import WhatsAppMessages from '#lib/components/WhatsAppMessages.svelte';
	import { formatClockTime, formatMatchDay, translator } from '#lib/i18n/messages.js';
	import { mapLinks } from '#lib/maps.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
	const s = $derived(data.session);
	const tz = $derived(data.club.timeZone);
	const maps = $derived(mapLinks(s.venue.address));
</script>

<svelte:head><title>{t('training.title')} {formatMatchDay(s.startsAt, data.locale, tz)}</title></svelte:head>

<p><a href="/{data.club.slug}">{t('match.back')}</a></p>
<h1>{t('training.title')}</h1>
{#if s.cancelled}<p class="cancelled" role="status">{t('training.cancelled')}</p>{/if}
{#if s.tooFewTables}<p class="few-tables" role="status">⚠ {t('training.tooFewTables', { free: String(s.freeTables) })}</p>{/if}

<dl>
	<dt>{t('match.when')}</dt>
	<dd>
		{formatMatchDay(s.startsAt, data.locale, tz)}<br />
		<strong class="time">{formatClockTime(s.startsAt, data.locale, tz)}–{formatClockTime(s.endsAt, data.locale, tz)}</strong>
	</dd>
	<dt>{t('match.where')}</dt>
	<dd><strong>{s.venue.name}</strong><br /><address>{s.venue.address}</address></dd>
	<dt>{t('training.comingTitle')}</dt>
	<dd>
		<strong>{t('training.comingAndTables', { count: String(s.coming), free: String(s.freeTables) })}</strong>
		{#if s.comingNames?.length}<br />{s.comingNames.join(', ')}{/if}
	</dd>
</dl>

{#if data.canAnswer && !s.cancelled && !s.isPast}
	<h2>{t('training.question')}</h2>
	<TrainingButtons sessionId={s.id} current={s.myAnswer} locale={data.locale} />
{/if}

<p class="maps">
	<a href={maps.mapyCz} target="_blank" rel="noopener noreferrer">Mapy.cz</a> ·
	<a href={maps.googleMaps} target="_blank" rel="noopener noreferrer">Google Maps</a>
</p>

{#if data.isAdmin && !s.isPast}
	<section class="admin">
		{#if s.cancelled}
			<form method="POST" action="?/restore"><button type="submit">{t('training.restore')}</button></form>
		{:else}
			<form method="POST" action="?/cancel">
				<button type="submit" class:primary={s.tooFewTables}>{t('training.cancel')}</button>
				<p class="hint">{t('training.cancelHint')}</p>
			</form>
		{/if}
	</section>
	{#if data.whatsapp && !s.cancelled}<WhatsAppMessages messages={data.whatsapp} locale={data.locale} />{/if}
{/if}

<style>
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
	address {
		font-style: normal;
	}
	.cancelled {
		background: #57534e;
		color: #fff;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		font-weight: 700;
	}
	.few-tables {
		background: #fef2f2;
		color: #991b1b;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		font-weight: 700;
	}
	.admin {
		margin-top: 2rem;
		border-top: 1px solid #e5e5e0;
		padding-top: 1rem;
	}
</style>
