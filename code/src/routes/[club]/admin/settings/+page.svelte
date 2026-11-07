<script lang="ts">
	import { translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('settings.title')}</h1>
<p class="hint">{t('settings.intro')}</p>

<form method="POST" class="stack">
	<label>
		{t('settings.totalTables')}
		<input name="totalTables" type="number" inputmode="numeric" min="1" max="100" required value={data.settings.totalTables} />
	</label>
	<label>
		{t('settings.tablesPerHomeMatch')}
		<input name="tablesPerHomeMatch" type="number" inputmode="numeric" min="1" max="100" required value={data.settings.tablesPerHomeMatch} />
	</label>
	<label>
		{t('settings.minTrainingTables')}
		<input name="minTrainingTables" type="number" inputmode="numeric" min="0" max="100" required value={data.settings.minTrainingTables} />
	</label>
	{#if form && 'error' in form && form.error}<p class="error">{t(`error.${form.error}` as MessageKey)}</p>{/if}
	{#if form && 'settingsSaved' in form}<p class="ok">✓ {t('settings.saved')}</p>{/if}
	<button type="submit" class="primary">{t('admin.save')}</button>
</form>
