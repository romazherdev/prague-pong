<script lang="ts">
	import { translator } from '#lib/i18n/messages.js';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();
	const t = $derived(translator(data.locale));
	const base = $derived(`/${data.club.slug}`);
</script>

<nav class="club-nav">
	<a href={base}>{t('nav.calendar')}</a>
	{#if data.signedIn?.isAdmin}
		<a href="{base}/admin">{t('nav.admin')}</a>
	{/if}
	<span class="spacer"></span>
	{#if data.signedIn}
		<span class="who">{data.signedIn.name}</span>
		<form method="POST" action="{base}/sign-out">
			<button type="submit" class="link">{t('nav.signOut')}</button>
		</form>
	{:else}
		<a href="{base}/sign-in" class="quiet">{t('nav.signIn')}</a>
	{/if}
</nav>

{@render children()}

<style>
	.club-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1rem;
		margin-bottom: 0.5rem;
	}
	.club-nav a,
	.link {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		color: #1d4ed8;
	}
	.spacer {
		flex: 1;
	}
	.who {
		color: #555;
	}
	.quiet {
		font-size: 0.95rem;
	}
	.link {
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
	}
</style>
