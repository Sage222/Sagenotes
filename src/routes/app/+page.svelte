<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  export let data: { notes: any[]; q: string; username: string };

  let notes = data.notes;
  let binNotes: any[] = [];
  let showBin = false;

  let selectedId: string | null = null;
  let expanded: Record<string, boolean> = {};

  let title = '';
  let tabs: any[] = [];
  let activeTabId: string | null = null;
  let tabContent = '';

  let saving = false;
  let saveTimer: ReturnType<typeof setTimeout>;
  let searchQ = data.q;

  onMount(() => {
    if (notes[0]) selectedId = notes[0].id;
  });

  async function loadNote(id: string) {
    if (!browser) return;
    const res = await fetch(`/api/notes/${id}`);
    const note = await res.json();
    title = note.title;
    tabs = note.tabs ?? [];
    if (tabs.length === 0) {
      const t = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ noteId: id, name: 'Main' })
      }).then(r => r.json());
      tabs = [t];
    }
    activeTabId = tabs[0]?.id ?? null;
    tabContent = tabs.find(t => t.id === activeTabId)?.content ?? '';
  }

  $: if (selectedId && browser) loadNote(selectedId);

  function selectTab(id: string) {
    saveTabNow();
    activeTabId = id;
    tabContent = tabs.find(t => t.id === id)?.content ?? '';
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAll, 600);
  }

  async function saveAll() {
    if (!selectedId) return;
    saving = true;
    notes = notes.map(n => n.id === selectedId
      ? { ...n, title }
      : { ...n, children: (n.children ?? []).map((c: any) => c.id === selectedId ? { ...c, title } : c) }
    );
    await Promise.all([
      fetch('/api/notes', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: selectedId, title, content: tabContent })
      }),
      activeTabId ? fetch('/api/tabs', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: activeTabId, content: tabContent })
      }) : Promise.resolve()
    ]);
    saving = false;
  }

  async function saveTabNow() {
    if (!activeTabId) return;
    await fetch('/api/tabs', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: activeTabId, content: tabContent })
    });
    tabs = tabs.map(t => t.id === activeTabId ? { ...t, content: tabContent } : t);
  }

  async function createNote(parentId: string | null = null) {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled', content: '', parentId })
    });
    const note = await res.json();
    if (parentId) {
      notes = notes.map(n => n.id === parentId
        ? { ...n, children: [note, ...(n.children ?? [])] }
        : n);
      expanded[parentId] = true;
    } else {
      notes = [{ ...note, children: [] }, ...notes];
    }
    selectedId = note.id;
  }

  async function moveNoteToBin(id: string, noteTitle: string) {
    if (!confirm(`Move "${noteTitle || 'Untitled'}" to the recycle bin?`)) return;
    await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id })
    });
    notes = notes
      .filter(n => n.id !== id)
      .map(n => ({ ...n, children: (n.children ?? []).filter((c: any) => c.id !== id) }));
    if (selectedId === id) {
      selectedId = notes[0]?.id ?? null;
      if (!selectedId) { title = ''; tabs = []; tabContent = ''; }
    }
    if (showBin) await loadBin();
  }

  async function deleteCurrentTab() {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;
    if (tabs.length <= 1) {
      alert("Can't delete the only tab. Use the bin icon on the note to remove the whole note.");
      return;
    }
    if (!confirm(`Delete tab "${tab.name}"? This cannot be undone.`)) return;
    await fetch('/api/tabs', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: activeTabId })
    });
    tabs = tabs.filter(t => t.id !== activeTabId);
    activeTabId = tabs[0].id;
    tabContent = tabs[0].content;
  }

  async function addTab() {
    if (!selectedId) return;
    await saveTabNow();
    const name = prompt('Tab name:', `Tab ${tabs.length + 1}`);
    if (!name) return;
    const t = await fetch('/api/tabs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ noteId: selectedId, name })
    }).then(r => r.json());
    tabs = [...tabs, t];
    activeTabId = t.id;
    tabContent = '';
  }

  async function loadBin() {
    const res = await fetch('/api/notes?bin=1');
    binNotes = await res.json();
  }

  async function toggleBin() {
    showBin = !showBin;
    if (showBin) await loadBin();
  }

  async function restoreNote(id: string) {
    await fetch('/api/notes', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, action: 'restore' })
    });
    binNotes = binNotes.filter(n => n.id !== id);
    const res = await fetch('/api/notes');
    notes = await res.json();
  }

  async function emptyBin() {
    if (!confirm(`Permanently delete all ${binNotes.length} item(s)? This cannot be undone.`)) return;
    await fetch('/api/notes', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'empty-bin' })
    });
    binNotes = [];
  }

  function doSearch() {
    const url = searchQ.trim() ? `/app?q=${encodeURIComponent(searchQ.trim())}` : '/app';
    window.location.href = url;
  }

  function handleSearchKey(e: KeyboardEvent) {
    if (e.key === 'Enter') doSearch();
    if (e.key === 'Escape') { searchQ = ''; doSearch(); }
  }

  function toggleExpand(id: string) {
    expanded[id] = !expanded[id];
  }
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
  <!-- ── Sidebar ── -->
  <aside class="sidebar">

    <!-- Brand header — fixed at top -->
    <div class="sidebar-top">
      <div class="sidebar-brand">
        <svg class="brand-icon" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M8 10C8 7.8 9.8 6 12 6H29a3 3 0 0 1 3 3v19c0 1.1-.9 2-2 2H12a4 4 0 0 0-4 4V10Z"/>
          <path d="M13 10h13M13 16h15M13 22h9"/>
        </svg>
        <span class="brand-name">SageNotes</span>
        <button class="btn-icon" on:click={() => createNote(null)} aria-label="New note" title="New note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>

      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input bind:value={searchQ} on:keydown={handleSearchKey} placeholder="Search notes…" aria-label="Search notes" />
        {#if searchQ}
          <button class="search-clear" on:click={() => { searchQ = ''; doSearch(); }} aria-label="Clear search">×</button>
        {/if}
      </div>
    </div>

    <!-- Note list — scrollable middle section -->
    <nav class="note-list" aria-label="Notes">
      {#each notes as note (note.id)}
        <div class="note-group">
          <div class="note-row" class:active={note.id === selectedId}>
            {#if (note.children?.length ?? 0) > 0}
              <button class="chevron" on:click={() => toggleExpand(note.id)} aria-label="Toggle subnotes">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="transform: rotate({expanded[note.id] ? 90 : 0}deg); transition: transform 150ms">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            {:else}
              <span class="chevron-placeholder"></span>
            {/if}
            <button class="note-item" on:click={() => (selectedId = note.id)} aria-current={note.id === selectedId ? 'page' : undefined}>
              <span class="note-title">{note.title || 'Untitled'}</span>
            </button>
            <div class="note-actions">
              <button class="btn-row-icon" on:click={() => createNote(note.id)} aria-label="Add subnote" title="Add subnote">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </button>
              <button class="btn-row-icon btn-bin" on:click={() => moveNoteToBin(note.id, note.title)} aria-label="Move to bin" title="Move to bin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
          </div>

          {#if expanded[note.id] && (note.children?.length ?? 0) > 0}
            <div class="subnotes">
              {#each note.children as child (child.id)}
                <div class="note-row sub-row" class:active={child.id === selectedId}>
                  <span class="chevron-placeholder"></span>
                  <button class="note-item" on:click={() => (selectedId = child.id)} aria-current={child.id === selectedId ? 'page' : undefined}>
                    <span class="sub-dot" aria-hidden="true"></span>
                    <span class="note-title">{child.title || 'Untitled'}</span>
                  </button>
                  <div class="note-actions">
                    <button class="btn-row-icon btn-bin" on:click={() => moveNoteToBin(child.id, child.title)} aria-label="Move to bin" title="Move to bin">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}

      {#if notes.length === 0}
        <div class="empty-list">
          <p>{data.q ? `No results for "${data.q}"` : 'No notes yet.'}</p>
          {#if data.q}
            <button class="link" on:click={() => { searchQ = ''; doSearch(); }}>Clear search</button>
          {:else}
            <button class="link" on:click={() => createNote(null)}>Create your first note</button>
          {/if}
        </div>
      {/if}
    </nav>

    <!-- Recycle Bin — fixed at bottom above footer -->
    <div class="sidebar-bottom">
      <div class="bin-section">
        <button class="bin-toggle" on:click={toggleBin} aria-expanded={showBin}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="bin-icon" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
          </svg>
          <span>Recycle Bin</span>
          {#if binNotes.length > 0}
            <span class="bin-count">{binNotes.length}</span>
          {/if}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="bin-chevron" style="transform: rotate({showBin ? 180 : 0}deg); transition: transform 150ms" aria-hidden="true">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        {#if showBin}
          <div class="bin-contents">
            {#if binNotes.length === 0}
              <p class="bin-empty">Bin is empty</p>
            {:else}
              {#each binNotes as note (note.id)}
                <div class="bin-item">
                  <span class="bin-item-title">{note.title || 'Untitled'}</span>
                  <button class="btn-restore" on:click={() => restoreNote(note.id)} title="Restore note">↩ Restore</button>
                </div>
              {/each}
              <button class="btn-empty-bin" on:click={emptyBin}>Empty bin ({binNotes.length})</button>
            {/if}
          </div>
        {/if}
      </div>

      <div class="sidebar-footer">
        <span class="username">{data.username}</span>
        <a href="/logout" class="logout-btn">Log out</a>
      </div>
    </div>
  </aside>

  <!-- ── Editor ── -->
  <main class="editor-pane">
    {#if selectedId}
      <div class="editor-header">
        <input class="title-input" bind:value={title} on:input={queueSave} placeholder="Note title" aria-label="Note title" />
        <span class="save-status" aria-live="polite">{saving ? 'Saving…' : ''}</span>
      </div>

      <div class="tabs-bar">
        {#each tabs as tab (tab.id)}
          <div class="tab-wrap" class:tab-active={tab.id === activeTabId}>
            <button class="tab-btn" on:click={() => selectTab(tab.id)}>{tab.name}</button>
            <button class="tab-close" on:click={deleteCurrentTab} aria-label="Delete tab" title="Delete this tab">×</button>
          </div>
        {/each}
        <button class="tab-add" on:click={addTab} aria-label="Add tab" title="New tab">+</button>
      </div>

      <div class="editor-body">
        <textarea bind:value={tabContent} on:input={queueSave} placeholder="Start writing…" aria-label="Note content" spellcheck="true"></textarea>
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
        <p>Pick a note from the sidebar or create a new one.</p>
        <button class="btn-primary" on:click={() => createNote(null)}>New note</button>
      </div>
    {/if}
  </main>
</div>

<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :global(html, body) {
    height: 100%; margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background: #171614; color: #cdccca;
    -webkit-font-smoothing: antialiased;
  }

  /* Shell: two columns, full height */
  .shell {
    display: grid;
    grid-template-columns: 290px 1fr;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── Sidebar: flex column so bottom is always visible ── */
  .sidebar {
    background: #1c1b19;
    border-right: 1px solid #252422;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  /* Top section: brand + search — shrinks to content */
  .sidebar-top {
    flex-shrink: 0;
    border-bottom: 1px solid #252422;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 14px 12px;
    border-bottom: 1px solid #252422;
  }
  .brand-icon { width: 22px; height: 22px; color: #4f98a3; flex-shrink: 0; }
  .brand-name { font-size: 0.95rem; font-weight: 700; color: #e2e1de; flex: 1; }
  .btn-icon {
    width: 30px; height: 30px; border-radius: 7px;
    border: 1px solid #393836; background: #252422;
    color: #cdccca; cursor: pointer; display: grid; place-items: center;
    transition: background 140ms, border-color 140ms;
    flex-shrink: 0;
  }
  .btn-icon:hover { background: #2d2c2a; border-color: #4f98a3; color: #4f98a3; }
  .btn-icon svg { width: 14px; height: 14px; }

  .search-wrap { position: relative; padding: 10px 12px; }
  .search-icon {
    position: absolute; left: 24px; top: 50%; transform: translateY(-50%);
    width: 14px; height: 14px; color: #555350; pointer-events: none;
  }
  .search-wrap input {
    width: 100%; padding: 8px 28px 8px 32px;
    border: 1px solid #393836; border-radius: 8px;
    background: #222120; color: #cdccca;
    font: inherit; font-size: 0.85rem; outline: none;
    transition: border-color 140ms;
  }
  .search-wrap input:focus { border-color: #4f98a3; box-shadow: 0 0 0 3px rgba(79,152,163,.15); }
  .search-wrap input::placeholder { color: #555350; }
  .search-clear {
    position: absolute; right: 20px; top: 50%; transform: translateY(-50%);
    background: none; border: none; color: #555350; cursor: pointer; font-size: 1.1rem; padding: 2px 6px;
  }
  .search-clear:hover { color: #cdccca; }

  /* Note list: takes remaining space and scrolls */
  .note-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: #2a2927 transparent;
  }
  .note-list::-webkit-scrollbar { width: 4px; }
  .note-list::-webkit-scrollbar-thumb { background: #2a2927; border-radius: 4px; }

  .note-group { display: flex; flex-direction: column; }
  .note-row {
    display: flex; align-items: center; gap: 2px;
    border-radius: 8px; transition: background 120ms;
  }
  .note-row:hover { background: #222120; }
  .note-row.active { background: #1e2e30; }

  .chevron {
    width: 22px; height: 22px; flex-shrink: 0;
    display: grid; place-items: center;
    background: none; border: none; color: #555350; cursor: pointer; padding: 0; border-radius: 4px;
  }
  .chevron:hover { color: #cdccca; }
  .chevron svg { width: 12px; height: 12px; }
  .chevron-placeholder { width: 22px; flex-shrink: 0; }

  .note-item {
    flex: 1; padding: 9px 2px; background: transparent; border: none;
    color: #cdccca; text-align: left; cursor: pointer; min-width: 0;
    display: flex; align-items: center; gap: 6px;
  }
  .note-title {
    font-size: 0.875rem; font-weight: 500; color: #d8d7d4;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;
  }
  .note-row.active .note-title { color: #7fc4cc; }
  .sub-dot { width: 5px; height: 5px; border-radius: 50%; background: #444; flex-shrink: 0; }

  .note-actions {
    display: flex; gap: 1px; opacity: 0; transition: opacity 140ms;
    flex-shrink: 0; padding-right: 4px;
  }
  .note-row:hover .note-actions { opacity: 1; }

  .btn-row-icon {
    width: 22px; height: 22px; display: grid; place-items: center;
    background: none; border: none; color: #555350; cursor: pointer;
    padding: 0; border-radius: 4px; transition: background 140ms, color 140ms;
  }
  .btn-row-icon:hover { background: #2a2927; color: #cdccca; }
  .btn-row-icon.btn-bin:hover { background: #3a1a1a; color: #e06060; }
  .btn-row-icon svg { width: 12px; height: 12px; }

  .subnotes { padding-left: 22px; display: flex; flex-direction: column; gap: 1px; }

  .empty-list {
    padding: 20px 10px; text-align: center; color: #555350;
    font-size: 0.85rem; display: grid; gap: 8px;
  }
  .link {
    color: #4f98a3; background: none; border: none; cursor: pointer;
    font: inherit; font-size: inherit; text-decoration: underline; padding: 0;
  }

  /* Bottom section: bin + footer — always visible, shrinks to content */
  .sidebar-bottom {
    flex-shrink: 0;
    border-top: 1px solid #252422;
  }

  /* ── Recycle Bin ── */
  .bin-section { border-bottom: 1px solid #252422; }

  .bin-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: none;
    border: none;
    color: #636260;
    cursor: pointer;
    font: 500 0.82rem 'Inter', sans-serif;
    transition: background 140ms, color 140ms;
    text-align: left;
  }
  .bin-toggle:hover { background: #222120; color: #cdccca; }
  .bin-icon { width: 14px; height: 14px; flex-shrink: 0; }
  .bin-toggle > span:nth-child(2) { flex: 1; }
  .bin-count {
    background: #393836; color: #9a9896; font-size: 0.7rem;
    padding: 1px 7px; border-radius: 99px;
  }
  .bin-chevron { width: 14px; height: 14px; flex-shrink: 0; }

  .bin-contents {
    padding: 4px 10px 10px;
    display: flex; flex-direction: column; gap: 3px;
    max-height: 200px; overflow-y: auto;
    scrollbar-width: thin; scrollbar-color: #2a2927 transparent;
  }
  .bin-empty { font-size: 0.8rem; color: #555350; text-align: center; padding: 8px 0; }
  .bin-item {
    display: flex; align-items: center; gap: 6px; padding: 5px 6px;
    border-radius: 6px; transition: background 120ms;
  }
  .bin-item:hover { background: #222120; }
  .bin-item-title {
    flex: 1; font-size: 0.82rem; color: #797876;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .btn-restore {
    background: none; border: 1px solid #2a3a3b; color: #4f98a3;
    cursor: pointer; font-size: 0.75rem; padding: 2px 8px;
    border-radius: 4px; transition: background 140ms; flex-shrink: 0; white-space: nowrap;
  }
  .btn-restore:hover { background: #1e2e30; }
  .btn-empty-bin {
    margin-top: 4px; width: 100%; padding: 6px;
    background: none; border: 1px solid #3a2020;
    border-radius: 6px; color: #9a5050; cursor: pointer;
    font: 500 0.8rem 'Inter', sans-serif;
    transition: background 140ms, color 140ms, border-color 140ms;
  }
  .btn-empty-bin:hover { background: #3a1a1a; color: #e06060; border-color: #7a2020; }

  /* Footer */
  .sidebar-footer {
    padding: 10px 14px;
    display: flex; align-items: center;
    justify-content: space-between; gap: 8px;
  }
  .username { font-size: 0.8rem; color: #636260; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .logout-btn {
    font-size: 0.8rem; color: #636260; text-decoration: none;
    background: none; border: none; cursor: pointer;
    padding: 4px 8px; border-radius: 6px;
    transition: background 140ms, color 140ms; white-space: nowrap;
  }
  .logout-btn:hover { background: #252422; color: #cdccca; }

  /* ── Editor ── */
  .editor-pane {
    display: flex; flex-direction: column;
    overflow: hidden; background: #171614;
  }
  .editor-header {
    display: flex; align-items: center; gap: 10px;
    padding: 14px 20px 10px;
    border-bottom: 1px solid #222120;
    flex-shrink: 0;
  }
  .title-input {
    flex: 1; background: transparent; border: none;
    color: #e8e7e4; font: 600 1.15rem/1.3 'Inter', sans-serif;
    outline: none; min-width: 0;
  }
  .title-input::placeholder { color: #3a3938; }
  .save-status { font-size: 0.75rem; color: #4f98a3; min-width: 50px; text-align: right; flex-shrink: 0; }

  /* Tabs */
  .tabs-bar {
    display: flex; align-items: center; gap: 2px;
    padding: 0 16px; border-bottom: 1px solid #222120;
    background: #1a1917; overflow-x: auto; scrollbar-width: none;
    min-height: 38px; flex-shrink: 0;
  }
  .tabs-bar::-webkit-scrollbar { display: none; }
  .tab-wrap {
    display: flex; align-items: center;
    border-radius: 6px 6px 0 0;
    border: 1px solid transparent; border-bottom: none;
    transition: background 140ms;
  }
  .tab-wrap.tab-active { background: #171614; border-color: #2a2927; border-bottom-color: #171614; }
  .tab-wrap:not(.tab-active):hover { background: #202020; }
  .tab-btn {
    padding: 6px 8px 6px 12px; background: none; border: none;
    color: #797876; cursor: pointer; font: 500 0.8rem 'Inter', sans-serif;
    white-space: nowrap; transition: color 140ms;
  }
  .tab-wrap.tab-active .tab-btn { color: #d8d7d4; }
  .tab-close {
    width: 18px; height: 18px; padding: 0; margin-right: 4px;
    background: none; border: none; color: #555350; cursor: pointer;
    font-size: 0.9rem; line-height: 1; display: grid; place-items: center;
    border-radius: 3px; transition: background 140ms, color 140ms;
  }
  .tab-close:hover { background: #3a1a1a; color: #e06060; }
  .tab-add {
    padding: 4px 10px; background: none; border: none;
    color: #555350; cursor: pointer; font-size: 1.1rem; line-height: 1;
    border-radius: 6px; transition: background 140ms, color 140ms; margin-left: 2px;
  }
  .tab-add:hover { background: #252422; color: #4f98a3; }

  .editor-body { flex: 1; overflow: hidden; display: flex; min-height: 0; }
  .editor-body textarea {
    flex: 1; width: 100%; height: 100%;
    padding: 20px 24px; background: transparent; border: none;
    color: #cdccca; font: 400 0.95rem/1.75 'Inter', sans-serif;
    resize: none; outline: none;
  }
  .editor-body textarea::placeholder { color: #333230; }

  /* Empty state */
  .no-note {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px; color: #525150; padding: 40px;
  }
  .no-note-icon svg { width: 56px; height: 56px; color: #2d2c2a; }
  .no-note h2 { font-size: 1.1rem; font-weight: 600; color: #636260; }
  .no-note p { font-size: 0.875rem; color: #555350; text-align: center; max-width: 30ch; }
  .btn-primary {
    padding: 9px 20px; background: #4f98a3; color: #fff;
    border: none; border-radius: 8px;
    font: 500 0.875rem 'Inter', sans-serif; cursor: pointer;
    transition: background 140ms;
  }
  .btn-primary:hover { background: #3d8490; }
</style>
