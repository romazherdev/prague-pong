<script lang="ts">
	import { formatMatchDay, formatMatchTime, translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
	const weekdays = [1, 2, 3, 4, 5, 6, 7];
	const dayName = (d: number) => t(`weekday.${d}` as MessageKey);
</script>

<h1>{t('trainingAdmin.title')}</h1>
{#if form && 'error' in form && form.error}<p class="error">{t(`error.${form.error}` as MessageKey)}</p>{/if}

{#snippet ruleFields(rule?: (typeof data.rules)[number])}
	<fieldset class="days">
		<legend>{t('trainingAdmin.days')}</legend>
		{#each weekdays as d (d)}
			<label class="day"><input type="checkbox" name="weekday" value={d} checked={rule?.weekdays.includes(d)} /> {dayName(d)}</label>
		{/each}
	</fieldset>
	<div class="times">
		<label>{t('trainingAdmin.from')} <input type="time" name="startTime" required value={rule?.startTime ?? '18:00'} /></label>
		<label>{t('trainingAdmin.to')} <input type="time" name="endTime" required value={rule?.endTime ?? '20:00'} /></label>
	</div>
	<label>
		{t('match.where')}
		<select name="venueId" required value={rule?.venueId ?? data.venues[0]?.id}>
			{#each data.venues as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
		</select>
	</label>
{/snippet}

{#each data.rules as rule (rule.id)}
	<section class="rule" class:ended={rule.endsOn}>
		<h2>{rule.weekdays.map(dayName).join(', ')} {rule.startTime}–{rule.endTime} · {rule.venue.name}</h2>
		{#if rule.endsOn}
			<p class="hint">{t('trainingAdmin.endedOn', { date: formatMatchDay(`${rule.endsOn}T12:00:00Z`, data.locale, data.club.timeZone) })}</p>
		{:else}
			<details>
				<summary>{t('trainingAdmin.edit')}</summary>
				<form method="POST" action="?/update" class="stack">
					<input type="hidden" name="ruleId" value={rule.id} />
					{@render ruleFields(rule)}
					<p class="hint">{t('trainingAdmin.editHint')}</p>
					<button type="submit" class="primary">{t('admin.save')}</button>
				</form>
				<form method="POST" action="?/end" class="stack end">
					<input type="hidden" name="ruleId" value={rule.id} />
					<label>{t('trainingAdmin.lastDate')} <input type="date" name="lastDate" required /></label>
					<button type="submit">{t('trainingAdmin.end')}</button>
				</form>
			</details>
		{/if}
		{#if form && 'saved' in form && form.saved === rule.id}<p class="ok">✓ {t('settings.saved')}</p>{/if}
	</section>
{/each}

<details class="new" open={data.rules.length === 0}>
	<summary>{t('trainingAdmin.add')}</summary>
	<form method="POST" action="?/create" class="stack">
		{@render ruleFields()}
		<button type="submit" class="primary">{t('trainingAdmin.addButton')}</button>
	</form>
</details>

<h2>{t('trainingAdmin.upcoming')}</h2>
<p class="hint">{t('trainingAdmin.upcomingHint')}</p>
<ul class="rows">
	{#each data.sessions.slice(0, 12) as s (s.id)}
		<li>
			<a class="row session" class:cancelled={s.cancelled} href="/{data.club.slug}/trainings/{s.id}">
				{formatMatchTime(s.startsAt, data.locale, data.club.timeZone)} · {t('training.coming', { count: String(s.coming) })}
				{#if s.cancelled}<strong>{t('training.cancelledShort')}</strong>{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	.rule {
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.25rem 1rem 0.75rem;
		margin-bottom: 0.75rem;
	}
	.rule.ended {
		opacity: 0.6;
	}
	.rule h2 {
		font-size: 1.05rem;
	}
	summary {
		min-height: 44px;
		display: flex;
		align-items: center;
		cursor: pointer;
		font-weight: 600;
		color: #1d4ed8;
	}
	.days {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 0.75rem;
		border: none;
		padding: 0;
	}
	.day {
		display: inline-flex !important;
		align-items: center;
		gap: 0.25rem;
		min-height: 44px;
	}
	.day input {
		width: 22px;
		height: 22px;
		min-height: 0;
	}
	.times {
		display: flex;
		gap: 0.75rem;
	}
	.end {
		margin-top: 1rem;
	}
	.session {
		color: inherit;
		text-decoration: none;
	}
	.session.cancelled {
		text-decoration: line-through;
		color: #777;
	}
</style>
