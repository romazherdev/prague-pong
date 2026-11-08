<script lang="ts">
	import CopyShare from '#lib/components/CopyShare.svelte';
	import { languageNames, translator, type MessageKey } from '#lib/i18n/messages.js';
	import { defaultLocale, locales, type Locale } from '#lib/i18n/locales.js';
	import { MATCH_MESSAGE_KINDS, type MatchMessageKind } from '#lib/message-kinds.js';

	/** The ready-made texts, by kind and language (built by the club core). */
	let { messages, locale }: { messages: Record<MatchMessageKind, Record<Locale, string>>; locale: Locale } = $props();
	const t = $derived(translator(locale));
	// Group messages default to Czech (the group's language), whatever the captain's own language.
	let messageLocale: Locale = $state(defaultLocale);
</script>

<section class="whatsapp">
	<h2>{t('whatsapp.title')}</h2>
	<p class="hint">{t('whatsapp.hint')}</p>
	<p class="lang">
		{t('share.messageLanguage')}:
		{#each locales as l (l)}
			<button type="button" class="link" aria-pressed={messageLocale === l} onclick={() => (messageLocale = l)}>{languageNames[l]}</button>
		{/each}
	</p>
	{#each MATCH_MESSAGE_KINDS as kind (kind)}
		<h3>{t(`whatsapp.${kind}` as MessageKey)}</h3>
		<CopyShare text={messages[kind][messageLocale]} {locale} />
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
