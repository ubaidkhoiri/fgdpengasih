const BAD = [
	'anjing',
	'babi',
	'bangsat',
	'tolol',
	'goblok',
	'kontol',
	'memek',
	'ngentot',
	'bajingan',
	'brengsek',
	'kampret',
	'jancuk',
	'asu',
	'bego',
	'bedebah'
];

const RES = BAD.map((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i'));

export function containsProfanity(text: string): boolean {
	return RES.some((re) => re.test(text));
}
