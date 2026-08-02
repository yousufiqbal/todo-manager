<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Todo Manager</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
