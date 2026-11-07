<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	let { count, locale }: { count: number; locale: Locale } = $props();
	const t = $derived(translator(locale));
</script>

{#if count > 0}<span class="spot-open">{t('spotOpen.label', { count: String(count) })}</span>{/if}

<style>
	.spot-open {
		display: inline-block;
		background: #dc2626;
		color: #fff;
		border-radius: 999px;
		padding: 0.125rem 0.625rem;
		font-size: 0.875rem;
		font-weight: 700;
	}
</style>
