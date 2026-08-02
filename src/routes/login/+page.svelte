<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let submitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		submitting = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? 'login failed';
				return;
			}
			await goto('/');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="wrap">
	<div class="panel">
		<svg class="icon logo" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>

		<form class="card" onsubmit={handleSubmit}>
			<div class="heading">
				<h1>Sign in</h1>
				<p>Enter your credentials to access your lists</p>
			</div>

			<label>
				Email
				<input type="email" bind:value={email} autocomplete="email" required />
			</label>
			<label>
				Password
				<input type="password" bind:value={password} autocomplete="current-password" required />
			</label>

			{#if error}
				<p class="error" role="alert">
					<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
					{error}
				</p>
			{/if}

			<button class="btn" type="submit" disabled={submitting}>
				{submitting ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	</div>
</div>

<style>
	.wrap {
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		padding: var(--space-4);
	}

	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-5);
	}

	.logo {
		width: 40px;
		height: 40px;
		stroke-width: 2.2;
		color: var(--fg);
	}

	form {
		width: 340px;
		max-width: 100%;
		padding: var(--space-6) var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		box-shadow: var(--shadow-md);
	}

	.heading {
		text-align: center;
		margin-bottom: var(--space-2);
	}

	h1 {
		font-size: 19px;
		font-weight: 600;
		margin: 0 0 6px;
	}

	.heading p {
		margin: 0;
		font-size: 13px;
		color: var(--fg-muted);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 13px;
		font-weight: 500;
		color: var(--fg-muted);
	}

	input {
		width: 100%;
	}

	.error {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--danger);
		background: var(--danger-bg);
		font-size: 13px;
		margin: 0;
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
	}

	.error .icon {
		width: 14px;
		height: 14px;
	}

	.btn {
		margin-top: 6px;
		padding: 10px 16px;
	}
</style>
