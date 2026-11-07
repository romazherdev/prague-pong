<script lang="ts">
	import { locales } from '#lib/i18n/locales.js';
	import { languageNames, translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
	let copied = $state(false);

	async function copyMessage() {
		if (!data.link) return;
		await navigator.clipboard.writeText(data.link.text);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<p><a href="/{data.club.slug}/admin/members">{t('members.back')}</a></p>
<h1>{data.member.name}</h1>

{#if data.link}
	<section class="share">
		<h2>{t('members.personalLink')}</h2>
		{#if data.added}<p class="notice">{t('members.addedHint')}</p>{/if}
		<p class="hint">{t('members.personalLinkHint')}</p>
		<p class="lang">
			{t('members.messageLanguage')}:
			{#each locales as l (l)}
				<a href="?lang={l}" aria-current={data.messageLang === l ? 'true' : undefined}>{languageNames[l]}</a>
			{/each}
		</p>
		<pre class="message">{data.link.text}</pre>
		<div class="actions">
			<button type="button" class="primary" onclick={copyMessage}>{copied ? t('members.copied') : t('members.copyMessage')}</button>
			<a class="button" href="https://wa.me/?text={encodeURIComponent(data.link.text)}" target="_blank" rel="noopener noreferrer"
				>{t('members.openWhatsApp')}</a
			>
		</div>
		<form method="POST" action="?/regenerate">
			{#if form && 'regenerated' in form}<p class="notice">{t('members.regenerated')}</p>{/if}
			<button type="submit">{t('members.regenerate')}</button>
			<p class="hint">{t('members.regenerateHint')}</p>
		</form>
	</section>
{/if}

<form method="POST" action="?/update" class="stack">
	<h2>{t('members.edit')}</h2>
	<label>
		{t('members.name')}
		<input name="name" required value={data.member.name} />
	</label>
	<label>
		{t('members.emailOptional')}
		<input name="email" type="email" value={data.member.email ?? ''} />
	</label>
	<p class="hint">{t('members.emailHint')}</p>
	{#if form && 'error' in form && form.error}<p class="error">{t(`error.${form.error}` as MessageKey)}</p>{/if}
	{#if form && 'saved' in form}<p class="ok">✓ {t('members.saved')}</p>{/if}
	<button type="submit" class="primary">{t('admin.save')}</button>
</form>

{#if data.member.active}
	<form method="POST" action="?/deactivate" class="danger">
		<h2>{t('members.deactivate')}</h2>
		<p class="hint">{t('members.deactivateHint')}</p>
		<button type="submit">{t('members.deactivate')}</button>
	</form>
{/if}

<style>
	section,
	form {
		margin-bottom: 1.5rem;
	}
	.message {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font: inherit;
		font-size: 1rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.button {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 1.25rem;
		border-radius: 0.5rem;
		background: #15803d;
		color: #fff;
		text-decoration: none;
		font-weight: 600;
	}
	.lang a {
		margin-left: 0.5rem;
	}
	.lang a[aria-current] {
		font-weight: 700;
	}
	.danger {
		border-top: 1px solid #e5e5e0;
		padding-top: 1rem;
	}
</style>
