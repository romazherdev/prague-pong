import type { Locale } from '#lib/i18n/locales.js';

declare global {
	namespace App {
		interface Locals {
			locale: Locale;
		}
	}
}

export {};
