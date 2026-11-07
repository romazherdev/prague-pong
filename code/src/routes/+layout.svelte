<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { locales } from '#lib/i18n/locales.js';
	import { languageNames, translator } from '#lib/i18n/messages.js';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(translator(data.locale));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{t('app.name')}</title>
</svelte:head>

<header>
	<strong>{t('app.name')}</strong>
	<form method="POST" action="/language">
		<input type="hidden" name="redirectTo" value={page.url.pathname} />
		<label>
			<span class="visually-hidden">{t('language.label')}</span>
			<select name="lang" value={data.locale}>
				{#each locales as l (l)}
					<option value={l}>{languageNames[l]}</option>
				{/each}
			</select>
		</label>
		<button type="submit">{t('language.switch')}</button>
	</form>
</header>

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: system-ui, sans-serif;
		font-size: 1.125rem;
		line-height: 1.5;
		color: #1a1a1a;
		background: #fafaf7;
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: #fff;
		border-bottom: 1px solid #e5e5e0;
	}
	header form {
		display: flex;
		gap: 0.5rem;
	}
	select,
	button {
		font: inherit;
		min-height: 44px;
		padding: 0 0.75rem;
	}
	main {
		max-width: 40rem;
		margin: 0 auto;
		padding: 1rem;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
