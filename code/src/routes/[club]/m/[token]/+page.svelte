<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

{#if 'invalid' in data}
	<h1>{t('me.linkInvalidTitle')}</h1>
	<p>{t('me.linkInvalid')}</p>
{:else}
	<h1>{t('me.switchTitle')}</h1>
	<p>{t('me.switchQuestion', { from: data.switchFrom, to: data.switchTo })}</p>
	<form method="POST">
		<button type="submit" class="primary">{t('me.switchConfirm', { to: data.switchTo })}</button>
	</form>
	<p><a href="/{data.club.slug}/me">{t('me.switchCancel', { from: data.switchFrom })}</a></p>
{/if}
