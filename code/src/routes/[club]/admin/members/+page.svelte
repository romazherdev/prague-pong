<script lang="ts">
	import { translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
	const base = $derived(`/${data.club.slug}/admin/members`);
</script>

<h1>{t('members.title')}</h1>

<form method="POST" action="?/add" class="stack">
	<h2>{t('members.add')}</h2>
	<label>
		{t('members.name')}
		<input name="name" required autocomplete="off" value={form?.name ?? ''} />
	</label>
	<label>
		{t('members.emailOptional')}
		<input name="email" type="email" autocomplete="off" value={form?.email ?? ''} />
	</label>
	{#if form && 'error' in form && form.error}<p class="error">{t(`error.${form.error}` as MessageKey)}</p>{/if}
	<button type="submit" class="primary">{t('members.addButton')}</button>
</form>

<h2>{t('members.active', { count: String(data.members.length) })}</h2>
<ul class="rows">
	{#each data.members as m (m.id)}
		<li>
			<a class="row member" href="{base}/{m.id}">
				<strong>{m.name}</strong>
				{#if m.team}<span class="tag team">{m.team.name}</span>{/if}
				{#if m.isAdmin}<span class="tag">{t('members.adminTag')}</span>{/if}
				{#if m.email}<span class="hint">{m.email}</span>{/if}
			</a>
		</li>
	{/each}
</ul>

{#if data.inactive.length}
	<h2>{t('members.inactive')}</h2>
	<ul class="rows">
		{#each data.inactive as m (m.id)}
			<li>
				<form method="POST" action="?/reactivate" class="row">
					<input type="hidden" name="memberId" value={m.id} />
					<span>{m.name}</span>
					<button type="submit">{t('members.reactivate')}</button>
				</form>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.member {
		color: inherit;
		text-decoration: none;
		align-items: center;
		min-height: 44px;
	}
	.tag.team {
		background: #e0e7ff;
	}
	.tag {
		background: #fef3c7;
		border-radius: 999px;
		padding: 0 0.5rem;
		font-size: 0.875rem;
	}
</style>
