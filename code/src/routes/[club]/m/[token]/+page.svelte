<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(translator(data.locale));
</script>

<h1>{t('me.linkInvalidTitle')}</h1>
<p>{t('me.linkInvalid')}</p>
