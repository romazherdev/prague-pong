/**
 * A person's name reduced for matching: no accents, lower case, words sorted. So "Novák Petr" (STIS lists
 * surname first), "Petr Novák" and "petr novak" all match.
 */
export function nameKey(name: string): string {
	return name
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.split(/[\s,]+/)
		.filter(Boolean)
		.sort()
		.join(' ');
}

/** "Novák Petr" (STIS order, surname first) → "Petr Novák". Single words stay as they are. */
export function firstNameFirst(stisName: string): string {
	const words = stisName.trim().split(/\s+/);
	return words.length < 2 ? words.join(' ') : [words.at(-1), ...words.slice(0, -1)].join(' ');
}
