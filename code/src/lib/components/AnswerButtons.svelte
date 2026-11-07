<script lang="ts">
	import { enhance } from '$app/forms';
	import { translator, type MessageKey } from '#lib/i18n/messages.js';
	import type { Locale } from '#lib/i18n/locales.js';

	type Answer = 'yes' | 'maybe' | 'no';
	let { matchId, current, locale, action = '?/answer' }: { matchId: string; current: Answer | null; locale: Locale; action?: string } =
		$props();
	const t = $derived(translator(locale));
	const answers: Answer[] = ['yes', 'maybe', 'no'];
</script>

<!-- One tap answers: each button is its own submit. Works without JavaScript too. -->
<form method="POST" {action} use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: true })}>
	<input type="hidden" name="matchId" value={matchId} />
	<div class="answers" role="group" aria-label={t('answer.label')}>
		{#each answers as answer (answer)}
			<button type="submit" name="answer" value={answer} class={answer} aria-pressed={current === answer}>
				{t(`answer.${answer}` as MessageKey)}
			</button>
		{/each}
	</div>
</form>

<style>
	.answers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
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
	.yes[aria-pressed='true'] {
		background: #15803d;
		border-color: #15803d;
		color: #fff;
	}
	.maybe[aria-pressed='true'] {
		background: #ca8a04;
		border-color: #ca8a04;
		color: #fff;
	}
	.no[aria-pressed='true'] {
		background: #b91c1c;
		border-color: #b91c1c;
		color: #fff;
	}
</style>
