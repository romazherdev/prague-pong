<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('admin.title')}</h1>
<ul class="admin-links">
	<li><a href="/{data.club.slug}/admin/members">{t('nav.members')}</a></li>
	<li><a href="/{data.club.slug}/admin/rosters">{t('rosters.title')}</a></li>
</ul>

<h2>{t('admin.captains')}</h2>
<ul class="rows">
	{#each data.teams as team (team.id)}
		<li>
			<form method="POST" action="?/setCaptain" class="row">
				<input type="hidden" name="teamId" value={team.id} />
				<label>
					<strong>{t('match.team', { team: team.name })}</strong>
					<select name="memberId" value={team.captain?.id ?? ''}>
						<option value="">{t('admin.noCaptain')}</option>
						{#each data.members as m (m.id)}
							<option value={m.id}>{m.name}</option>
						{/each}
					</select>
				</label>
				<button type="submit">{t('admin.save')}</button>
				{#if form?.saved === team.id}<span class="ok">✓</span>{/if}
			</form>
		</li>
	{/each}
</ul>
<p class="hint">{t('admin.captainHint')}</p>
