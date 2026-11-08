<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	/** A ready-made text with "copy" and "open in WhatsApp" buttons. */
	let { text, locale, copyLabel }: { text: string; locale: Locale; copyLabel?: string } = $props();
	const t = $derived(translator(locale));
	let copied = $state(false);

	async function copy() {
		await navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 2500);
	}
</script>

<pre>{text}</pre>
<div class="actions">
	<button type="button" class="primary" onclick={copy}>{copied ? t('share.copied') : (copyLabel ?? t('share.copy'))}</button>
	<a class="button" href="https://wa.me/?text={encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">{t('share.openWhatsApp')}</a>
</div>

<style>
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
</style>
