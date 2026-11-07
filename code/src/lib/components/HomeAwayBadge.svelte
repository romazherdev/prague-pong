<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	let { isHome, locale }: { isHome: boolean; locale: Locale } = $props();
	const t = $derived(translator(locale));
</script>

<span class="badge" class:home={isHome}>{isHome ? t('match.home') : t('match.away')}</span>

<style>
	.badge {
		display: inline-block;
		padding: 0 0.5rem;
		border-radius: 999px;
		background: #eee;
		font-size: 0.875rem;
	}
	.badge.home {
		background: #dff3e4;
	}
</style>
