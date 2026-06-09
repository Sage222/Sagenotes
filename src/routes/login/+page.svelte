<script lang="ts">
  export let form: { error?: string; username?: string } | null = null;
</script>

<svelte:head>
  <title>SageNotes — Sign in</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#171614" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shell">
  <div class="panel">
    <div class="brand">
      <div class="logo-wrap" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 10C8 7.8 9.8 6 12 6H29a3 3 0 0 1 3 3v19c0 1.1-.9 2-2 2H12a4 4 0 0 0-4 4V10Z"/>
          <path d="M13 10h13M13 16h15M13 22h9"/>
        </svg>
      </div>
      <div>
        <p class="eyebrow">Self-hosted · Private</p>
        <h1>SageNotes</h1>
      </div>
    </div>

    <form method="POST" class="card" novalidate>
      <label for="username">Username</label>
      <input
        id="username"
        name="username"
        type="text"
        autocomplete="username"
        value={form?.username ?? ''}
        required
        placeholder="sage"
      />

      <label for="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autocomplete="current-password"
        required
        placeholder="••••••••"
      />

      {#if form?.error}
        <p class="error" role="alert">{form.error}</p>
      {/if}

      <button type="submit">Sign in</button>
    </form>
  </div>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html) { background: #171614; }
  :global(body) { margin: 0; font-family: 'Inter', system-ui, sans-serif; background: #171614; color: #cdccca; -webkit-font-smoothing: antialiased; }

  .shell {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px;
    background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(79,152,163,.18) 0%, transparent 60%), #171614;
  }

  .panel { width: min(100%, 420px); display: grid; gap: 28px; }

  .brand { display: flex; align-items: center; gap: 16px; }

  .logo-wrap {
    width: 52px; height: 52px; flex-shrink: 0;
    border-radius: 14px;
    background: #1f1d1b;
    border: 1px solid #393836;
    display: grid; place-items: center;
    color: #4f98a3;
  }
  .logo-wrap svg { width: 26px; height: 26px; }

  .eyebrow { font-size: 0.8rem; color: #797876; margin-bottom: 4px; letter-spacing: .02em; }
  h1 { font-size: 1.75rem; font-weight: 700; color: #e8e7e4; line-height: 1; }

  .card {
    display: grid; gap: 14px;
    padding: 28px;
    border-radius: 20px;
    background: #1c1b19;
    border: 1px solid #2e2d2b;
    box-shadow: 0 20px 48px rgba(0,0,0,.32), 0 2px 8px rgba(0,0,0,.2);
  }

  label { font-size: 0.875rem; color: #9a9995; font-weight: 500; }

  input {
    width: 100%;
    padding: 13px 16px;
    border: 1px solid #393836;
    border-radius: 12px;
    background: #222120;
    color: #cdccca;
    font: inherit;
    font-size: 1rem;
    outline: none;
    transition: border-color 150ms, box-shadow 150ms;
  }
  input:focus {
    border-color: #4f98a3;
    box-shadow: 0 0 0 3px rgba(79,152,163,.18);
  }
  input::placeholder { color: #555350; }

  button {
    margin-top: 4px;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: #4f98a3;
    color: #0f1a1b;
    font: inherit;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 150ms, transform 80ms;
  }
  button:hover { background: #3d8590; }
  button:active { transform: scale(.98); }

  .error {
    padding: 12px 14px;
    border-radius: 10px;
    background: rgba(209,99,167,.12);
    border: 1px solid rgba(209,99,167,.2);
    color: #e8a8cc;
    font-size: 0.875rem;
  }
</style>
