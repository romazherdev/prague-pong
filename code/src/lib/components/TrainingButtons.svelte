<script lang="ts">
	import { enhance } from '$app/forms';
	import { translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	let {
		sessionId,
		current,
		locale,
		action = '?/training'
	}: { sessionId: string; current: 'in' | 'out' | null; locale: Locale; action?: string } = $props();
	const t = $derived(translator(locale));
	let error: string | null = $state(null);
</script>

<!-- One tap: "I'm coming" or "Not this time". Works without JavaScript too. -->
<form
	method="POST"
	{action}
	use:enhance={() =>
		async ({ result, update }) => {
			error = result.type === 'failure' ? String(result.data?.error ?? 'answerInvalid') : null;
			await update({ reset: false, invalidateAll: true });
		}}
>
	<input type="hidden" name="sessionId" value={sessionId} />
	<div class="answers" role="group" aria-label={t('training.question')}>
		<button type="submit" name="answer" value="in" class="in" aria-pressed={current === 'in'}>{t('training.in')}</button>
		<button type="submit" name="answer" value="out" class="out" aria-pressed={current === 'out'}>{t('training.out')}</button>
	</div>
	{#if error}<p class="error" role="alert">{t(`error.${error}` as MessageKey)}</p>{/if}
</form>

<style>
	.answers {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
	}
	button {
		min-height: 52px;
		border-radius: 0.5rem;
		border: 2px solid #c8c8c0;
		background: #fff;
		font-weight: 700;
		cursor: pointer;
	}
	.in[aria-pressed='true'] {
		background: #15803d;
		border-color: #15803d;
		color: #fff;
	}
	.out[aria-pressed='true'] {
		background: #57534e;
		border-color: #57534e;
		color: #fff;
	}
</style>
