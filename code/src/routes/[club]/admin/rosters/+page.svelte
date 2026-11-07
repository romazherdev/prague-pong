<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
	const open = $derived(data.entries.filter((e) => !e.confirmedMember));
	const done = $derived(data.entries.filter((e) => e.confirmedMember));
</script>

<h1>{t('rosters.title')}</h1>
<p class="hint">{t('rosters.intro')}</p>

{#if data.entries.length === 0}
	<p class="notice">{t('rosters.empty')}</p>
{:else}
	<h2>{t('rosters.toConfirm', { count: String(open.length) })}</h2>
	<ul class="rows">
		{#each open as entry (entry.id)}
			<li>
				<form method="POST" action="?/confirm" class="row">
					<input type="hidden" name="entryId" value={entry.id} />
					<label>
						<span><strong>{entry.playerName}</strong> · {t('match.team', { team: entry.teamName })}</span>
						<select name="who" value={entry.suggestedMember?.id ?? 'new'}>
							<option value="new">{t('rosters.newMember')}</option>
							{#each data.members as m (m.id)}
								<option value={m.id}>{m.name}{m.id === entry.suggestedMember?.id ? ` (${t('rosters.suggested')})` : ''}</option>
							{/each}
						</select>
					</label>
					<button type="submit" class="primary">{t('rosters.confirm')}</button>
				</form>
			</li>
		{/each}
	</ul>

	{#if done.length}
		<h2>{t('rosters.confirmed', { count: String(done.length) })}</h2>
		<ul class="rows">
			{#each done as entry (entry.id)}
				<li class="row">
					{entry.playerName} · {t('match.team', { team: entry.teamName })} → <strong>{entry.confirmedMember?.name}</strong>
					{#if form?.confirmed === entry.id}<span class="ok">✓</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}
