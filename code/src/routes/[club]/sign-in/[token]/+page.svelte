<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('signIn.title')}</h1>

{#if form?.expired}
	<p class="error">{t('signIn.expired')}</p>
	<p><a href="/{data.club.slug}/sign-in">{t('signIn.again')}</a></p>
{:else}
	<form method="POST">
		<button type="submit" class="primary">{t('signIn.confirm')}</button>
	</form>
{/if}
