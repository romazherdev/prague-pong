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
		<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />
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
	:global(input:not([type='hidden']), select, button, textarea) {
		font: inherit;
		min-height: 44px;
		box-sizing: border-box;
	}
	:global(input:not([type='hidden'])) {
		width: 100%;
		padding: 0 0.75rem;
	}
	:global(.stack) {
		display: grid;
		gap: 0.75rem;
		max-width: 24rem;
	}
	:global(.stack label) {
		display: grid;
		gap: 0.25rem;
	}
	:global(button.primary) {
		background: #1d4ed8;
		color: #fff;
		border: none;
		border-radius: 0.5rem;
		padding: 0 1.25rem;
		font-weight: 600;
		cursor: pointer;
	}
	:global(.error) {
		color: #b91c1c;
	}
	:global(.notice) {
		background: #e0f2fe;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
	}
	:global(.hint) {
		color: #555;
		font-size: 0.95rem;
	}
	:global(.rows) {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	:global(.row) {
		display: flex;
		flex-wrap: wrap;
		align-items: end;
		gap: 0.5rem 0.75rem;
		background: #fff;
		border: 1px solid #e5e5e0;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
	}
	:global(.row label) {
		display: grid;
		gap: 0.25rem;
	}
	:global(.ok) {
		color: #15803d;
		font-weight: 700;
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
	}
</style>
