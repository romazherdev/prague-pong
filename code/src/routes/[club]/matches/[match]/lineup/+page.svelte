<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatMatchTime, translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));

	// The picked players, kept in the page so the counter and the 4-player limit react as boxes are ticked.
	let picked = $state(new Set<string>());
	$effect.pre(() => {
		picked = new Set(data.lineup.map((p) => p.id));
	});
	const toggle = (id: string, on: boolean) => {
		const next = new Set(picked);
		if (on) next.add(id);
		else next.delete(id);
		picked = next;
	};

	const own = $derived(data.candidates.filter((c) => !c.fromOtherTeam));
	const others = $derived(data.candidates.filter((c) => c.fromOtherTeam));
	const answerLabel = (a: string | null) => t(`lineup.answer.${a ?? 'none'}` as MessageKey);
</script>

<p><a href="/{data.club.slug}/matches/{data.match.id}">{t('match.backToMatch')}</a></p>
<h1>{t('lineup.title')}</h1>
<p>
	<strong>{t('match.team', { team: data.match.team.name })}</strong>
	{t('match.versus', { opponent: data.match.opponent })} · {formatMatchTime(data.match.startsAt, data.locale, data.club.timeZone)}
</p>

{#if data.warnings.length}
	<div class="warning" role="status">
		<strong>{t('lineup.warningTitle')}</strong>
		<ul>
			{#each data.warnings as w (w.memberId)}
				<li>{t(`lineup.warning.${w.answer ?? 'none'}` as MessageKey, { name: w.name })}</li>
			{/each}
		</ul>
	</div>
{/if}
{#if form && 'error' in form && form.error}<p class="error">{t(`error.${form.error}` as MessageKey)}</p>{/if}

<form method="POST" use:enhance={() => async ({ update }) => update({ reset: false })}>
	{#snippet group(list: typeof data.candidates)}
		<ul class="candidates">
			{#each list as c (c.id)}
				{@const checked = picked.has(c.id)}
				<li>
					<label class="candidate" class:checked>
						<input
							type="checkbox"
							name="memberId"
							value={c.id}
							{checked}
							disabled={!checked && picked.size >= data.maxSize}
							onchange={(e) => toggle(c.id, e.currentTarget.checked)}
						/>
						<span class="name">{c.name}{#if c.fromOtherTeam && c.team} <span class="team">({c.team.name})</span>{/if}</span>
						<span class="answer {c.answer ?? 'none'}">{answerLabel(c.answer)}</span>
					</label>
				</li>
			{/each}
		</ul>
	{/snippet}

	<h2>{t('match.team', { team: data.match.team.name })}</h2>
	{@render group(own)}
	<h2>{t('lineup.substitutes')}</h2>
	<p class="hint">{t('lineup.substitutesHint')}</p>
	{@render group(others)}

	<div class="save">
		<span>{t('lineup.count', { count: String(picked.size), max: String(data.maxSize) })}</span>
		<button type="submit" class="primary">{t('lineup.save')}</button>
		{#if form && 'saved' in form}<span class="ok">✓ {t('members.saved')}</span>{/if}
	</div>
</form>

<style>
	.candidates {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.375rem;
	}
	.candidate {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		min-height: 52px;
		padding: 0 0.75rem;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.candidate.checked {
		border: 2px solid #1d4ed8;
		background: #eff6ff;
	}
	input[type='checkbox'] {
		width: 24px;
		height: 24px;
		min-height: 0;
	}
	.name {
		flex: 1;
	}
	.team {
		color: #555;
	}
	.answer {
		font-size: 0.875rem;
		font-weight: 700;
		color: #555;
	}
	.answer.yes {
		color: #15803d;
	}
	.answer.maybe {
		color: #a16207;
	}
	.answer.no {
		color: #b91c1c;
	}
	.warning {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	.warning ul {
		margin: 0.25rem 0 0;
	}
	.save {
		position: sticky;
		bottom: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 0;
		background: #fafaf7;
		font-weight: 600;
	}
</style>
