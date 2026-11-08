<script lang="ts">
	import { languageNames, translator, type MessageKey } from '#lib/i18n/messages.js';
	import { defaultLocale, locales, type Locale } from '#lib/i18n/locales.js';

	type Kind = 'reminder' | 'share';
	/** The ready-made texts, by kind and language (built by the club core). */
	let { messages, locale }: { messages: Record<Kind, Record<Locale, string>>; locale: Locale } = $props();
	const t = $derived(translator(locale));
	// Group messages default to Czech (the group's language), whatever the captain's own language.
	let messageLocale: Locale = $state(defaultLocale);
	let copied: Kind | null = $state(null);

	async function copy(kind: Kind) {
		await navigator.clipboard.writeText(messages[kind][messageLocale]);
		copied = kind;
		setTimeout(() => (copied = null), 2500);
	}
</script>

<section class="whatsapp">
	<h2>{t('whatsapp.title')}</h2>
	<p class="hint">{t('whatsapp.hint')}</p>
	<p class="lang">
		{t('members.messageLanguage')}:
		{#each locales as l (l)}
			<button type="button" class="link" aria-pressed={messageLocale === l} onclick={() => (messageLocale = l)}>{languageNames[l]}</button>
		{/each}
	</p>
	{#each ['reminder', 'share'] as const as kind (kind)}
		<div class="message">
			<h3>{t(`whatsapp.${kind}` as MessageKey)}</h3>
			<pre>{messages[kind][messageLocale]}</pre>
			<div class="actions">
				<button type="button" class="primary" onclick={() => copy(kind)}>{copied === kind ? t('members.copied') : t('whatsapp.copy')}</button>
				<a class="button" href="https://wa.me/?text={encodeURIComponent(messages[kind][messageLocale])}" target="_blank" rel="noopener noreferrer"
					>{t('members.openWhatsApp')}</a
				>
			</div>
		</div>
	{/each}
</section>

<style>
	.whatsapp {
		margin-top: 2rem;
		border-top: 1px solid #e5e5e0;
		padding-top: 0.5rem;
	}
	h3 {
		font-size: 1rem;
		margin-bottom: 0.25rem;
	}
	pre {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		font: inherit;
		font-size: 0.95rem;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
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
	.link {
		background: none;
		border: none;
		color: #1d4ed8;
		text-decoration: underline;
		cursor: pointer;
		font: inherit;
	}
	.link[aria-pressed='true'] {
		font-weight: 700;
		text-decoration: none;
	}
</style>
