<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('signIn.title')}</h1>

{#if form?.sent}
	<p class="notice">{t('signIn.sent', { email: form.email })}</p>
{:else}
	<p>{t('signIn.intro')}</p>
	<form method="POST" class="stack">
		<label>
			{t('signIn.email')}
			<input type="email" name="email" autocomplete="email" required value={form?.email ?? ''} />
		</label>
		{#if form?.invalid}<p class="error">{t('signIn.invalidEmail')}</p>{/if}
		<button type="submit" class="primary">{t('signIn.send')}</button>
	</form>
{/if}
