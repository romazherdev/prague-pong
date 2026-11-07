<script lang="ts">
	import { onMount } from 'svelte';
	import { translator } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	let { clubSlug, vapidPublicKey, locale }: { clubSlug: string; vapidPublicKey: string | null; locale: Locale } = $props();
	const t = $derived(translator(locale));

	type State = 'loading' | 'unsupported' | 'iosNeedsInstall' | 'denied' | 'off' | 'on' | 'busy';
	let state: State = $state('loading');

	const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const isStandalone = () =>
		matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

	onMount(async () => {
		if (!vapidPublicKey) return void (state = 'unsupported');
		if (isIos() && !isStandalone()) return void (state = 'iosNeedsInstall');
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) return void (state = 'unsupported');
		if (Notification.permission === 'denied') return void (state = 'denied');
		const registration = await navigator.serviceWorker.ready;
		state = (await registration.pushManager.getSubscription()) ? 'on' : 'off';
	});

	const post = (body: unknown) =>
		fetch(`/${clubSlug}/push`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

	async function turnOn() {
		state = 'busy';
		try {
			if ((await Notification.requestPermission()) !== 'granted') return void (state = 'denied');
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidPublicKey! });
			const res = await post({ subscribe: subscription.toJSON() });
			state = res.ok ? 'on' : 'off';
		} catch {
			state = 'off';
		}
	}

	async function turnOff() {
		state = 'busy';
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		if (subscription) {
			await post({ unsubscribe: subscription.endpoint });
			await subscription.unsubscribe();
		}
		state = 'off';
	}
</script>

<section class="push">
	<h2>{t('push.title')}</h2>
	{#if state === 'iosNeedsInstall'}
		<p class="hint">{t('push.iosHint')}</p>
	{:else if state === 'unsupported'}
		<p class="hint">{t('push.unsupported')}</p>
	{:else if state === 'denied'}
		<p class="hint">{t('push.denied')}</p>
	{:else if state === 'on'}
		<p>{t('push.isOn')}</p>
		<button type="button" onclick={turnOff}>{t('push.turnOff')}</button>
	{:else if state === 'off' || state === 'busy'}
		<p class="hint">{t('push.explain')}</p>
		<button type="button" class="primary" disabled={state === 'busy'} onclick={turnOn}>{t('push.turnOn')}</button>
	{/if}
</section>

<style>
	.push {
		margin-top: 2rem;
		border-top: 1px solid #e5e5e0;
		padding-top: 0.5rem;
	}
</style>
