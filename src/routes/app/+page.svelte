<script lang="ts">
  export let data: { notes: { id: string; title: string; updatedAt: string }[]; q: string; username: string };

  let notes = data.notes;
  let selectedId: string | null = notes[0]?.id ?? null;
  let title = '';
  let content = '';
  let preview = false;
  let saving = false;
  let saveTimer: ReturnType<typeof setTimeout>;

  async function loadNote(id: string) {
    const res = await fetch(`/api/notes/${id}`);
    const note = await res.json();
    title = note.title;
    content = note.content;
  }

  $: if (selectedId) loadNote(selectedId);

  async function createNote() {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', content: '' })
    });
    const note = await res.json();
    notes = [note, ...notes];
    selectedId = note.id;
    title = note.title;
    content = note.content;
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCurrent, 500);
  }

  async function saveCurrent() {
    if (!selectedId) return;
    saving = true;
    const res = await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: selectedId, title, content })
    });
    const updated = await res.json();
    notes = notes
      .map((n) => n.id === updated.id ? { ...n, title: updated.title, updatedAt: updated.updatedAt } : n)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    saving = false;
  }

  async function removeNote() {
    if (!selectedId || !confirm('Delete this note?')) return;
    await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: selectedId })
    });
    notes = notes.filter((n) => n.id !== selectedId);
    selectedId = notes[0]?.id ?? null;
    if (selectedId) { loadNote(selectedId); } else { title = ''; content = ''; }
  }

  function selectNote(id: string) { selectedId = id; }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  import { marked } from 'marked';
  $: renderedContent = marked.parse(content || '');
</script>

<svelte:head>
  <title>SageNotes</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#171614" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shell">
  <!-- Sidebar -->
  <aside class="sidebar">
    <div class="sidebar-brand">
      <svg class="brand-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 10C8 7.8 9.8 6 12 6H29a3 3 0 0 1 3 3v19c0 1.1-.9 2-2 2H12a4 4 0 0 0-4 4V10Z"/>
        <path d="M13 10h13M13 16h15M13 22h9"/>
      </svg>
      <span class="brand-name">SageNotes</span>
      <button class="btn-icon" on:click={createNote} aria-label="New note" title="New note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </div>

    <form method="GET" action="/app" class="search-form">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input name="q" value={data.q} placeholder="Search notes…" aria-label="Search notes" />
    </form>

    <nav class="note-list" aria-label="Notes">
      {#each notes as note (note.id)}
        <button
          class="note-item"
          class:active={note.id === selectedId}
          on:click={() => selectNote(note.id)}
          aria-current={note.id === selectedId ? 'page' : undefined}
        >
          <span class="note-title">{note.title || 'Untitled'}</span>
          <span class="note-date">{formatDate(note.updatedAt)}</span>
        </button>
      {/each}
      {#if notes.length === 0}
        <div class="empty-list">
          <p>No notes found.</p>
          {#if data.q}<a href="/app">Clear search</a>{:else}<button class="link" on:click={createNote}>Create your first note</button>{/if}
        </div>
      {/if}
    </nav>

    <div class="sidebar-footer">
      <span class="username">{data.username}</span>
      <form method="POST" action="/logout">
        <button type="submit" class="logout-btn">Log out</button>
      </form>
    </div>
  </aside>

  <!-- Editor -->
  <main class="editor-pane">
    {#if selectedId}
      <div class="editor-header">
        <input
          class="title-input"
          bind:value={title}
          on:input={queueSave}
          placeholder="Note title"
          aria-label="Note title"
        />
        <div class="editor-actions">
          <span class="save-status" aria-live="polite">{saving ? 'Saving…' : 'Saved'}</span>
          <button class="btn-ghost" on:click={() => (preview = !preview)}>
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button class="btn-danger" on:click={removeNote} aria-label="Delete note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>

      <div class="editor-body">
        {#if preview}
          <article class="prose">{@html renderedContent}</article>
        {:else}
          <textarea
            bind:value={content}
            on:input={queueSave}
            placeholder="Start writing…"
            aria-label="Note content"
            spellcheck="true"
          ></textarea>
        {/if}
      </div>
    {:else}
      <div class="no-note">
        <div class="no-note-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 14C10 11.8 11.8 10 14 10H35a4 4 0 0 1 4 4v24c0 1.1-.9 2-2 2H14a6 6 0 0 0-6 6V14Z"/>
            <path d="M16 18h16M16 25h18M16 32h10"/>
          </svg>
        </div>
        <h2>No note selected</h2>
        <p>Select a note from the sidebar or create a new one.</p>
        <button class="btn-primary" on:click={createNote}>New note</button>
      </div>
    {/if}
  </main>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html) { height: 100%; }
  :global(body) { margin: 0; height: 100%; font-family: 'Inter', system-ui, sans-serif; background: #171614; color: #cdccca; -webkit-font-smoothing: antialiased; }

  .shell {
    display: grid;
    grid-template-columns: 300px 1fr;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .sidebar {
    background: #1c1b19;
    border-right: 1px solid #2a2927;
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    overflow: hidden;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 16px 14px;
    border-bottom: 1px solid #252422;
  }
  .brand-icon { width: 22px; height: 22px; color: #4f98a3; flex-shrink: 0; }
  .brand-name { font-size: 1rem; font-weight: 700; color: #e2e1de; flex: 1; }

  .btn-icon {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid #393836;
    background: #252422; color: #cdccca; cursor: pointer;
    display: grid; place-items: center; flex-shrink: 0;
    transition: background 150ms, border-color 150ms;
  }
  .btn-icon:hover { background: #2d2c2a; border-color: #4f98a3; color: #4f98a3; }
  .btn-icon svg { width: 16px; height: 16px; }

  .search-form {
    position: relative;
    padding: 12px 14px;
    border-bottom: 1px solid #252422;
  }
  .search-icon {
    position: absolute; left: 26px; top: 50%; transform: translateY(-50%);
    width: 15px; height: 15px; color: #555350; pointer-events: none;
  }
  .search-form input {
    width: 100%; padding: 9px 12px 9px 34px;
    border: 1px solid #393836; border-radius: 10px;
    background: #222120; color: #cdccca; font: inherit; font-size: 0.875rem;
    outline: none; transition: border-color 150ms, box-shadow 150ms;
  }
  .search-form input:focus { border-color: #4f98a3; box-shadow: 0 0 0 3px rgba(79,152,163,.15); }
  .search-form input::placeholder { color: #555350; }

  .note-list { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 2px; }
  .note-item {
    width: 100%; padding: 10px 12px; border-radius: 10px;
    border: 1px solid transparent; background: transparent;
    color: #cdccca; text-align: left; cursor: pointer;
    display: flex; flex-direction: column; gap: 3px;
    transition: background 120ms, border-color 120ms;
  }
  .note-item:hover { background: #222120; }
  .note-item.active { background: #1e2e30; border-color: rgba(79,152,163,.35); }
  .note-title { font-size: 0.9rem; font-weight: 600; color: #e2e1de; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .note-item.active .note-title { color: #7fc4cc; }
  .note-date { font-size: 0.75rem; color: #636260; }

  .empty-list { padding: 24px 12px; text-align: center; color: #636260; font-size: 0.875rem; display: grid; gap: 10px; }
  .empty-list a, .link { color: #4f98a3; background: none; border: none; cursor: pointer; font: inherit; font-size: inherit; text-decoration: underline; padding: 0; }

  .sidebar-footer {
    padding: 12px 16px;
    border-top: 1px solid #252422;
    display: flex; align-items: center; justify-content: space-between;
  }
  .username { font-size: 0.8rem; color: #555350; }
  .logout-btn {
    font-size: 0.8rem; color: #636260; background: none; border: none; cursor: pointer;
    padding: 6px 10px; border-radius: 8px; transition: color 150ms, background 150ms;
  }
  .logout-btn:hover { color: #cdccca; background: #252422; }

  /* ── Editor ── */
  .editor-pane {
    display: grid;
    grid-template-rows: auto 1fr;
    background: #171614;
    overflow: hidden;
  }

  .editor-header {
    display: flex; align-items: center; gap: 16px;
    padding: 16px 28px 12px;
    border-bottom: 1px solid #252422;
    flex-shrink: 0;
  }
  .title-input {
    flex: 1; min-width: 0;
    font: inherit; font-size: 1.35rem; font-weight: 700; color: #e8e7e4;
    background: transparent; border: none; outline: none;
    padding: 4px 0;
  }
  .title-input::placeholder { color: #393836; }

  .editor-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .save-status { font-size: 0.78rem; color: #555350; min-width: 48px; text-align: right; }

  .btn-ghost {
    padding: 7px 14px; border-radius: 9px;
    border: 1px solid #393836; background: #1f1e1c; color: #9a9995;
    font: inherit; font-size: 0.85rem; cursor: pointer;
    transition: background 150ms, color 150ms;
  }
  .btn-ghost:hover { background: #252422; color: #cdccca; }

  .btn-danger {
    width: 34px; height: 34px; border-radius: 9px;
    border: 1px solid #393836; background: #1f1e1c; color: #9a9995;
    cursor: pointer; display: grid; place-items: center;
    transition: background 150ms, color 150ms, border-color 150ms;
  }
  .btn-danger svg { width: 16px; height: 16px; }
  .btn-danger:hover { background: rgba(209,99,167,.12); border-color: rgba(209,99,167,.3); color: #e8a8cc; }

  .editor-body { overflow: hidden; display: grid; }

  textarea {
    width: 100%; height: 100%;
    padding: 24px 32px;
    background: transparent; border: none; outline: none; resize: none;
    font: inherit; font-size: 1rem; line-height: 1.75; color: #cdccca;
    tab-size: 2;
  }
  textarea::placeholder { color: #393836; }

  .prose {
    padding: 24px 32px;
    overflow-y: auto;
    font-size: 1rem; line-height: 1.75; color: #cdccca;
  }
  .prose :global(h1) { font-size: 1.75rem; font-weight: 700; color: #e8e7e4; margin-bottom: 12px; }
  .prose :global(h2) { font-size: 1.35rem; font-weight: 700; color: #e2e1de; margin: 24px 0 10px; }
  .prose :global(h3) { font-size: 1.1rem; font-weight: 600; color: #d8d7d4; margin: 20px 0 8px; }
  .prose :global(p) { margin-bottom: 14px; max-width: 72ch; }
  .prose :global(li) { max-width: 70ch; margin-bottom: 4px; }
  .prose :global(ul), .prose :global(ol) { padding-left: 20px; margin-bottom: 14px; }
  .prose :global(code) { background: #252422; border-radius: 6px; padding: 2px 6px; font-size: .9em; color: #7fc4cc; }
  .prose :global(pre) { background: #1c1b19; border: 1px solid #2a2927; border-radius: 12px; padding: 16px 20px; overflow-x: auto; margin-bottom: 14px; }
  .prose :global(blockquote) { border-left: 3px solid #4f98a3; padding-left: 16px; color: #797876; margin-bottom: 14px; }
  .prose :global(a) { color: #4f98a3; }
  .prose :global(hr) { border: none; border-top: 1px solid #2a2927; margin: 24px 0; }

  .no-note {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 14px; height: 100%; text-align: center; color: #555350; padding: 40px;
  }
  .no-note-icon { width: 64px; height: 64px; color: #2e2d2b; }
  .no-note-icon svg { width: 64px; height: 64px; }
  .no-note h2 { font-size: 1.1rem; color: #797876; font-weight: 600; }
  .no-note p { font-size: 0.875rem; max-width: 30ch; }

  .btn-primary {
    padding: 10px 22px; border: none; border-radius: 10px;
    background: #4f98a3; color: #0f1a1b; font: inherit; font-weight: 700; cursor: pointer;
    transition: background 150ms;
  }
  .btn-primary:hover { background: #3d8590; }

  /* Mobile */
  @media (max-width: 820px) {
    .shell { grid-template-columns: 1fr; grid-template-rows: 260px 1fr; }
    .sidebar { border-right: none; border-bottom: 1px solid #2a2927; }
    .editor-pane { overflow: auto; }
    textarea, .prose { min-height: 50vh; }
    .editor-header { padding: 12px 16px; }
    textarea { padding: 16px; }
    .prose { padding: 16px; }
  }
</style>
