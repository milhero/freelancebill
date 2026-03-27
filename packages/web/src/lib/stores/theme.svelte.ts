type Theme = 'light' | 'dark' | 'system';

let theme = $state<Theme>('light');
let mediaQueryCleanup: (() => void) | null = null;

export function getTheme(): Theme {
	return theme;
}

export function setTheme(t: Theme) {
	theme = t;
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem('freelancebill-theme', t);
	}
	applyTheme();
}

export function initTheme() {
	if (typeof localStorage !== 'undefined') {
		const saved = localStorage.getItem('freelancebill-theme') as Theme | null;
		if (saved) theme = saved;
	}
	applyTheme();
	// Listen for system preference changes (clean up previous listener first)
	if (typeof window !== 'undefined') {
		if (mediaQueryCleanup) mediaQueryCleanup();
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handler = () => { if (theme === 'system') applyTheme(); };
		mq.addEventListener('change', handler);
		mediaQueryCleanup = () => mq.removeEventListener('change', handler);
	}
}

function applyTheme() {
	if (typeof document === 'undefined') return;
	const isDark =
		theme === 'dark' ||
		(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
	document.documentElement.classList.toggle('dark', isDark);
}

export function isDark(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		theme === 'dark' ||
		(theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
	);
}
