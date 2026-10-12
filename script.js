(function () {
  'use strict';

  var APP_KEY = 'webapp_noteBuddy';
  var APP_VERSION = '001.001';
  var NOTES_KEY = APP_KEY + '.notes.v1';
  var ACTIVE_KEY = APP_KEY + '.activeNoteId.v1';

  var ICONS = Object.assign({}, Buddy.ICONS, {
    bold: Buddy.icon('bold'),
    italic: Buddy.icon('italic'),
    strikethrough: Buddy.icon('strikethrough'),
    link: Buddy.icon('link'),
    code: Buddy.icon('code'),
    quote: Buddy.icon('quote'),
    listOrdered: Buddy.icon('listOrdered'),
    minus: Buddy.icon('minus')
  });
  var escapeHtml = Buddy.escapeHtml;

  var TOOLBAR_ICON_MAP = {
    bold: 'bold', italic: 'italic', strike: 'strikethrough',
    link: 'link', code: 'code', quote: 'quote',
    ul: 'list', ol: 'listOrdered', hr: 'minus'
  };

  var dom = {};
  var state = {
    notes: [],
    activeId: null,
    search: '',
    viewMode: 'preview',
    wordIndex: Object.create(null)
  };



  var autocompleteContext = null;
  var saveTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheDom();
    initStaticIcons();
    bindGlobalEvents();

    state.notes = loadNotes();
    buildWordIndex();

    var savedActive = loadActiveId();
    if (savedActive && findNote(savedActive)) {
      state.activeId = savedActive;
    } else if (state.notes.length) {
      state.activeId = sortedNotes()[0].id;
    }

    renderNoteList();
    renderEditor();
  }

  function cacheDom() {
    dom.btnSettings = document.getElementById('btnSettings');

    dom.noteSearch = document.getElementById('noteSearch');
    dom.btnNewNote = document.getElementById('btnNewNote');
    dom.btnExportAll = document.getElementById('btnExportAll');
    dom.fileImportData = document.getElementById('fileImportData');
    dom.fileBtnIcon = document.getElementById('fileBtnIcon');
    dom.noteList = document.getElementById('noteList');
    dom.noteListEmpty = document.getElementById('noteListEmpty');

    dom.emptyState = document.getElementById('emptyState');

    dom.editor = document.getElementById('editor');
    dom.noteTitleInput = document.getElementById('noteTitleInput');
    dom.wordCount = document.getElementById('wordCount');
    dom.btnToggleView = document.getElementById('btnToggleView');
    dom.btnDeleteNote = document.getElementById('btnDeleteNote');

    dom.mdToolbar = document.getElementById('mdToolbar');

    dom.editorBody = document.getElementById('editorBody');
    dom.noteSource = document.getElementById('noteSource');
    dom.notePreview = document.getElementById('notePreview');
    dom.wordSuggestPopover = document.getElementById('wordSuggestPopover');
    dom.linkSuggestPopover = document.getElementById('linkSuggestPopover');
  }

  function initStaticIcons() {
    dom.btnSettings.innerHTML = ICONS.settings;
    dom.btnExportAll.innerHTML = ICONS.download;
    dom.fileBtnIcon.innerHTML = ICONS.upload;
    dom.btnToggleView.innerHTML = ICONS.edit;
    dom.btnDeleteNote.innerHTML = ICONS.trash;

    dom.mdToolbar.querySelectorAll('[data-action]').forEach(function (btn) {
      var iconName = TOOLBAR_ICON_MAP[btn.getAttribute('data-action')];
      if (iconName) btn.innerHTML = ICONS[iconName];
    });
  }

  function bindGlobalEvents() {
    dom.btnSettings.addEventListener('click', openSettingsModal);
    dom.btnNewNote.addEventListener('click', handleNewNote);

    dom.btnExportAll.addEventListener('click', exportAllData);
    dom.fileImportData.addEventListener('change', function () {
      var file = this.files[0];
      if (file) importDataFromFile(file);
      this.value = '';
    });
    dom.noteListEmpty.addEventListener('click', function (e) {
      if (e.target.closest('#linkLoadSampleSidebar')) handleLoadSample(e);
    });

    dom.noteSearch.addEventListener('input', function () {
      state.search = dom.noteSearch.value;
      renderNoteList();
    });

    dom.noteTitleInput.addEventListener('input', persistActiveNoteEdits);
    dom.btnToggleView.addEventListener('click', toggleViewMode);
    dom.btnDeleteNote.addEventListener('click', function () {
      var note = getActiveNote();
      if (note) confirmAndDeleteNote(note.id);
    });

    dom.mdToolbar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (btn) applyToolbarAction(btn.getAttribute('data-action'));
    });

    dom.noteSource.addEventListener('input', handleSourceInput);
    dom.noteSource.addEventListener('keydown', handleSourceKeydown);
    dom.noteSource.addEventListener('click', closeAllPopovers);
    dom.noteSource.addEventListener('blur', function () {
      setTimeout(closeAllPopovers, 150);
    });

    dom.notePreview.addEventListener('click', handlePreviewClick);

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeAllPopovers();
    });

    window.addEventListener('resize', closeAllPopovers);
  }



  function loadNotes() {
    try {
      var raw = localStorage.getItem(NOTES_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveNotes() {
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(state.notes)); } catch (e) {}
  }

  function loadActiveId() {
    try { return localStorage.getItem(ACTIVE_KEY); } catch (e) { return null; }
  }

  function saveActiveId() {
    try {
      if (state.activeId) localStorage.setItem(ACTIVE_KEY, state.activeId);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch (e) {}
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveNotes();
      buildWordIndex();
    }, 400);
  }



  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function findNote(id) {
    return state.notes.filter(function (n) { return n.id === id; })[0];
  }

  function getActiveNote() {
    return state.activeId ? findNote(state.activeId) : null;
  }

  function sortedNotes() {
    return state.notes.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; });
  }

  function filteredSortedNotes() {
    var q = state.search.trim().toLowerCase();
    var list = sortedNotes();
    if (!q) return list;
    return list.filter(function (n) {
      return (n.title || '').toLowerCase().indexOf(q) !== -1 || (n.body || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  function handleNewNote() {
    var note = { id: generateId(), title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() };
    state.notes.push(note);
    saveNotes();
    buildWordIndex();
    state.activeId = note.id;
    saveActiveId();
    state.viewMode = 'source';
    renderNoteList();
    renderEditor();
    dom.noteTitleInput.focus();
  }

  function selectNote(id) {
    if (state.activeId === id) return;
    state.activeId = id;
    state.viewMode = 'preview';
    saveActiveId();
    renderNoteList();
    renderEditor();
  }

  function confirmAndDeleteNote(id) {
    var note = findNote(id);
    if (!note) return;
    openConfirmModal('Delete Note', 'Delete "' + (note.title || 'Untitled note') + '"? This cannot be undone.', 'Delete', function () {
      state.notes = state.notes.filter(function (n) { return n.id !== id; });
      saveNotes();
      buildWordIndex();
      if (state.activeId === id) {
        var remaining = sortedNotes();
        state.activeId = remaining.length ? remaining[0].id : null;
        saveActiveId();
        renderEditor();
      }
      renderNoteList();
    }, { danger: true });
  }



  function noteSnippet(body) {
    var plain = String(body || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`~-]/g, '')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > 90 ? plain.slice(0, 90) + '…' : plain;
  }

  function relativeTime(ts) {
    var diff = Math.max(0, Date.now() - ts);
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function renderNoteList() {
    var list = filteredSortedNotes();
    dom.noteListEmpty.hidden = list.length > 0;
    if (state.notes.length === 0) {
      dom.noteListEmpty.innerHTML = 'No notes yet. <a href="#" id="linkLoadSampleSidebar" class="link-accent">Load sample</a>.';
    } else {
      dom.noteListEmpty.textContent = 'No notes match your search.';
    }

    dom.noteList.innerHTML = list.map(function (n) {
      var title = escapeHtml(n.title || 'Untitled note');
      var snippet = escapeHtml(noteSnippet(n.body));
      return '<li class="note-item' + (n.id === state.activeId ? ' active' : '') + '" data-id="' + n.id + '">' +
        '<span class="note-item-title">' + title + '</span>' +
        (snippet ? '<span class="note-item-snippet">' + snippet + '</span>' : '') +
        '<span class="note-item-time">' + relativeTime(n.updatedAt) + '</span>' +
        '<button type="button" class="note-item-delete" data-id="' + n.id + '" title="Delete" aria-label="Delete note">' + ICONS.trash + '</button>' +
        '</li>';
    }).join('');

    dom.noteList.querySelectorAll('.note-item').forEach(function (li) {
      li.addEventListener('click', function (e) {
        if (e.target.closest('.note-item-delete')) return;
        selectNote(li.getAttribute('data-id'));
      });
    });
    dom.noteList.querySelectorAll('.note-item-delete').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        confirmAndDeleteNote(btn.getAttribute('data-id'));
      });
    });
  }

  function updateActiveNoteListItem() {
    var note = getActiveNote();
    if (!note) return;
    var li = dom.noteList.querySelector('.note-item[data-id="' + note.id + '"]');
    if (!li) return;
    var titleEl = li.querySelector('.note-item-title');
    if (titleEl) titleEl.textContent = note.title || 'Untitled note';
    var snippetEl = li.querySelector('.note-item-snippet');
    if (snippetEl) snippetEl.textContent = noteSnippet(note.body);
  }



  function renderEditor() {
    var note = getActiveNote();
    if (!note) {
      dom.emptyState.hidden = false;
      dom.editor.hidden = true;
      return;
    }
    dom.emptyState.hidden = true;
    dom.editor.hidden = false;
    dom.noteTitleInput.value = note.title;
    dom.noteSource.value = note.body;
    updateWordCount();
    applyViewMode();
  }

  function applyViewMode() {
    closeAllPopovers();
    var isPreview = state.viewMode === 'preview';
    dom.noteSource.hidden = isPreview;
    dom.notePreview.hidden = !isPreview;
    dom.mdToolbar.hidden = isPreview;
    dom.noteTitleInput.readOnly = isPreview;
    dom.btnToggleView.classList.toggle('active', !isPreview);
    dom.btnToggleView.setAttribute('aria-pressed', String(!isPreview));
    dom.btnToggleView.innerHTML = isPreview ? ICONS.edit : ICONS.eye;
    dom.btnToggleView.title = isPreview ? 'Edit note' : 'View note (read-only)';
    dom.btnToggleView.setAttribute('aria-label', isPreview ? 'Edit note' : 'View note (read-only)');
    if (isPreview) renderPreview();
    else dom.noteSource.focus();
  }

  function toggleViewMode() {
    state.viewMode = state.viewMode === 'preview' ? 'source' : 'preview';
    applyViewMode();
  }

  function renderPreview() {
    var note = getActiveNote();
    dom.notePreview.innerHTML = note ? Buddy.markdown.render(note.body) : '';
    enhanceCodeBlocks();
    enhanceTables();
  }

  function handlePreviewClick(e) {
    var a = e.target.closest('a[href^="#note-"]');
    if (!a) return;
    e.preventDefault();
    var id = a.getAttribute('href').slice('#note-'.length);
    if (findNote(id)) selectNote(id);
  }

  function updateWordCount() {
    var note = getActiveNote();
    var text = note ? note.body : '';
    var words = text.trim().match(/\S+/g);
    var count = words ? words.length : 0;
    dom.wordCount.textContent = count + (count === 1 ? ' word' : ' words');
  }



  function persistActiveNoteEdits() {
    var note = getActiveNote();
    if (!note) return;
    note.title = dom.noteTitleInput.value;
    note.body = dom.noteSource.value;
    note.updatedAt = Date.now();
    scheduleSave();
    updateActiveNoteListItem();
    updateWordCount();
  }

  function handleSourceInput() {
    persistActiveNoteEdits();
    handleAutocompleteInput();
  }



  function enhanceCodeBlocks() {
    dom.notePreview.querySelectorAll('pre').forEach(function (pre) {
      var wrapper = document.createElement('div');
      wrapper.className = 'code-block';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'code-copy-btn';
      btn.title = 'Copy';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = ICONS.copy;
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        copyToClipboard(code ? code.textContent : pre.textContent, btn);
      });
      wrapper.appendChild(btn);
    });
  }

  function enhanceTables() {
    dom.notePreview.querySelectorAll('table').forEach(function (table) {
      var wrapper = document.createElement('div');
      wrapper.className = 'table-wrap';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });
  }

  function copyToClipboard(text, btn) {
    function showCopied() {
      btn.classList.add('copied');
      btn.innerHTML = ICONS.check;
      setTimeout(function () {
        btn.classList.remove('copied');
        btn.innerHTML = ICONS.copy;
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(showCopied, function () { fallbackCopy(text, showCopied); });
    } else {
      fallbackCopy(text, showCopied);
    }
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    done();
  }



  function applyToolbarAction(action) {
    var ta = dom.noteSource;
    if (state.viewMode === 'preview') { state.viewMode = 'source'; applyViewMode(); }
    ta.focus();

    switch (action) {
      case 'bold': wrapSelection(ta, '**', '**', 'bold text'); break;
      case 'italic': wrapSelection(ta, '*', '*', 'italic text'); break;
      case 'strike': wrapSelection(ta, '~~', '~~', 'strikethrough text'); break;
      case 'h1': setHeading(ta, '# '); break;
      case 'h2': setHeading(ta, '## '); break;
      case 'h3': setHeading(ta, '### '); break;
      case 'link': insertLink(ta); break;
      case 'code': insertCode(ta); break;
      case 'quote': toggleLinePrefix(ta, '> '); break;
      case 'ul': toggleLinePrefix(ta, '- '); break;
      case 'ol': toggleOrderedList(ta); break;
      case 'hr': insertBlock(ta, '\n\n---\n\n'); break;
      default: return;
    }
    persistActiveNoteEdits();
  }

  function lineRange(value, start, end) {
    var lineStart = value.lastIndexOf('\n', start - 1) + 1;
    var idx = value.indexOf('\n', end);
    return { lineStart: lineStart, lineEnd: idx === -1 ? value.length : idx };
  }

  function wrapSelection(ta, before, after, placeholder) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var value = ta.value;
    var selected = value.slice(start, end);
    var text = selected || placeholder;
    ta.value = value.slice(0, start) + before + text + after + value.slice(end);
    var selStart = start + before.length;
    ta.setSelectionRange(selStart, selStart + text.length);
  }

  function setHeading(ta, prefix) {
    var value = ta.value;
    var start = ta.selectionStart;
    var lr = lineRange(value, start, start);
    var line = value.slice(lr.lineStart, lr.lineEnd);
    var stripped = line.replace(/^ {0,3}#{1,6}\s*/, '');
    var newLine = prefix + stripped;
    ta.value = value.slice(0, lr.lineStart) + newLine + value.slice(lr.lineEnd);
    var pos = lr.lineStart + newLine.length;
    ta.setSelectionRange(pos, pos);
  }

  function toggleLinePrefix(ta, prefix) {
    var value = ta.value;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var lr = lineRange(value, start, end);
    var lines = value.slice(lr.lineStart, lr.lineEnd).split('\n');
    var allPrefixed = lines.some(function (l) { return l.indexOf(prefix) === 0; }) &&
      lines.every(function (l) { return l.trim() === '' || l.indexOf(prefix) === 0; });

    var newLines = lines.map(function (l) {
      if (l.trim() === '') return l;
      if (allPrefixed) return l.indexOf(prefix) === 0 ? l.slice(prefix.length) : l;
      return l.indexOf(prefix) === 0 ? l : prefix + l;
    });
    var newBlock = newLines.join('\n');
    ta.value = value.slice(0, lr.lineStart) + newBlock + value.slice(lr.lineEnd);
    ta.setSelectionRange(lr.lineStart, lr.lineStart + newBlock.length);
  }

  function toggleOrderedList(ta) {
    var value = ta.value;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var lr = lineRange(value, start, end);
    var lines = value.slice(lr.lineStart, lr.lineEnd).split('\n');
    var alreadyOrdered = lines.some(function (l) { return /^\d+\.\s/.test(l); }) &&
      lines.every(function (l) { return l.trim() === '' || /^\d+\.\s/.test(l); });

    var n = 1;
    var newLines = lines.map(function (l) {
      if (l.trim() === '') return l;
      if (alreadyOrdered) return l.replace(/^\d+\.\s/, '');
      return (n++) + '. ' + l.replace(/^\d+\.\s/, '');
    });
    var newBlock = newLines.join('\n');
    ta.value = value.slice(0, lr.lineStart) + newBlock + value.slice(lr.lineEnd);
    ta.setSelectionRange(lr.lineStart, lr.lineStart + newBlock.length);
  }

  function insertBlock(ta, block) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var value = ta.value;
    ta.value = value.slice(0, start) + block + value.slice(end);
    var pos = start + block.length;
    ta.setSelectionRange(pos, pos);
  }

  function insertLink(ta) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var value = ta.value;
    var selected = value.slice(start, end);
    if (selected) {
      ta.value = value.slice(0, start) + '[' + selected + '](url)' + value.slice(end);
      var urlStart = start + selected.length + 3;
      ta.setSelectionRange(urlStart, urlStart + 3);
    } else {
      ta.value = value.slice(0, start) + '[link text](url)' + value.slice(end);
      ta.setSelectionRange(start + 1, start + 10);
    }
  }

  function insertCode(ta) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var value = ta.value;
    var selected = value.slice(start, end);

    if (selected.indexOf('\n') !== -1) {
      ta.value = value.slice(0, start) + '```\n' + selected + '\n```' + value.slice(end);
      ta.setSelectionRange(start + 4, start + 4 + selected.length);
      return;
    }

    if (!selected) {
      var lr = lineRange(value, start, start);
      if (value.slice(lr.lineStart, lr.lineEnd).trim() === '') {
        ta.value = value.slice(0, start) + '```\n\n```' + value.slice(start);
        var pos = start + 4;
        ta.setSelectionRange(pos, pos);
        return;
      }
    }

    wrapSelection(ta, '`', '`', 'code');
  }



  var PAIR_MAP = { '(': ')', '[': ']', '"': '"', '`': '`' };
  var CLOSERS = [')', ']', '"', '`'];

  function handleSourceKeydown(e) {
    if (!dom.wordSuggestPopover.hidden && handlePopoverKeydown(e, dom.wordSuggestPopover, acceptWordSuggestion)) return;
    if (!dom.linkSuggestPopover.hidden && handlePopoverKeydown(e, dom.linkSuggestPopover, acceptLinkSuggestion)) return;

    var ta = e.currentTarget;
    var ctrlKey = e.ctrlKey || e.metaKey;

    if (ctrlKey && !e.shiftKey && !e.altKey) {
      var lower = e.key.toLowerCase();
      if (lower === 'b') { e.preventDefault(); applyToolbarAction('bold'); return; }
      if (lower === 'i') { e.preventDefault(); applyToolbarAction('italic'); return; }
      if (lower === 'k') { e.preventDefault(); applyToolbarAction('link'); return; }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      handleTabIndent(ta, e.shiftKey);
      persistActiveNoteEdits();
      return;
    }

    if (e.key === 'Enter') {
      if (handleSmartEnter(ta)) { e.preventDefault(); persistActiveNoteEdits(); }
      return;
    }

    if (!ctrlKey && !e.altKey && PAIR_MAP[e.key]) {
      e.preventDefault();
      handleAutoPair(ta, e.key, PAIR_MAP[e.key]);
      persistActiveNoteEdits();
      return;
    }

    if (!ctrlKey && !e.altKey && CLOSERS.indexOf(e.key) !== -1) {
      var pos = ta.selectionStart;
      if (ta.selectionStart === ta.selectionEnd && ta.value.charAt(pos) === e.key) {
        e.preventDefault();
        ta.setSelectionRange(pos + 1, pos + 1);
      }
    }
  }

  function handleTabIndent(ta, outdent) {
    var value = ta.value;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var multiLine = value.slice(start, end).indexOf('\n') !== -1;

    if (!multiLine) {
      if (outdent) {
        var lr = lineRange(value, start, start);
        var beforeCursor = value.slice(lr.lineStart, start);
        var trim = beforeCursor.match(/ {1,2}$/);
        if (trim) {
          var removeLen = trim[0].length;
          ta.value = value.slice(0, start - removeLen) + value.slice(start);
          var pos = start - removeLen;
          ta.setSelectionRange(pos, pos);
        }
      } else {
        ta.value = value.slice(0, start) + '  ' + value.slice(end);
        var pos2 = start + 2;
        ta.setSelectionRange(pos2, pos2);
      }
      return;
    }

    var lr2 = lineRange(value, start, end);
    var lines = value.slice(lr2.lineStart, lr2.lineEnd).split('\n');
    var newLines = lines.map(function (l) {
      if (outdent) return l.replace(/^ {1,2}/, '');
      return l.trim() === '' ? l : '  ' + l;
    });
    var newBlock = newLines.join('\n');
    ta.value = value.slice(0, lr2.lineStart) + newBlock + value.slice(lr2.lineEnd);
    ta.setSelectionRange(lr2.lineStart, lr2.lineStart + newBlock.length);
  }

  function handleSmartEnter(ta) {
    var value = ta.value;
    var start = ta.selectionStart, end = ta.selectionEnd;
    if (start !== end) return false;

    var lr = lineRange(value, start, start);
    var fullLine = value.slice(lr.lineStart, lr.lineEnd);

    var bulletMatch = /^(\s*)([-*+])\s+(.*)$/.exec(fullLine);
    var orderedMatch = /^(\s*)(\d+)\.\s+(.*)$/.exec(fullLine);
    var quoteMatch = /^(\s*)>\s?(.*)$/.exec(fullLine);

    function exitList() {
      ta.value = value.slice(0, lr.lineStart) + value.slice(lr.lineEnd);
      ta.setSelectionRange(lr.lineStart, lr.lineStart);
    }

    if (bulletMatch) {
      if (bulletMatch[3].trim() === '') { exitList(); return true; }
      var insertB = '\n' + bulletMatch[1] + bulletMatch[2] + ' ';
      ta.value = value.slice(0, start) + insertB + value.slice(end);
      var posB = start + insertB.length;
      ta.setSelectionRange(posB, posB);
      return true;
    }

    if (orderedMatch) {
      if (orderedMatch[3].trim() === '') { exitList(); return true; }
      var insertO = '\n' + orderedMatch[1] + (parseInt(orderedMatch[2], 10) + 1) + '. ';
      ta.value = value.slice(0, start) + insertO + value.slice(end);
      var posO = start + insertO.length;
      ta.setSelectionRange(posO, posO);
      return true;
    }

    if (quoteMatch) {
      if (quoteMatch[2].trim() === '') { exitList(); return true; }
      var insertQ = '\n' + quoteMatch[1] + '> ';
      ta.value = value.slice(0, start) + insertQ + value.slice(end);
      var posQ = start + insertQ.length;
      ta.setSelectionRange(posQ, posQ);
      return true;
    }

    return false;
  }

  function handleAutoPair(ta, openChar, closeChar) {
    var start = ta.selectionStart, end = ta.selectionEnd;
    var value = ta.value;
    var selected = value.slice(start, end);
    if (selected) {
      ta.value = value.slice(0, start) + openChar + selected + closeChar + value.slice(end);
      ta.setSelectionRange(start + 1, start + 1 + selected.length);
    } else {
      ta.value = value.slice(0, start) + openChar + closeChar + value.slice(end);
      var pos = start + 1;
      ta.setSelectionRange(pos, pos);
    }
  }



  var mirrorDiv = null;
  var MIRROR_PROPS = [
    'boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'tabSize'
  ];

  function getCaretPixelPosition(ta) {
    if (!mirrorDiv) {
      mirrorDiv = document.createElement('div');
      mirrorDiv.style.position = 'absolute';
      mirrorDiv.style.visibility = 'hidden';
      mirrorDiv.style.whiteSpace = 'pre-wrap';
      mirrorDiv.style.wordWrap = 'break-word';
      mirrorDiv.style.top = '0';
      mirrorDiv.style.left = '-9999px';
      document.body.appendChild(mirrorDiv);
    }

    var style = window.getComputedStyle(ta);
    MIRROR_PROPS.forEach(function (prop) { mirrorDiv.style[prop] = style[prop]; });
    mirrorDiv.style.height = 'auto';

    mirrorDiv.textContent = ta.value.slice(0, ta.selectionStart);
    var marker = document.createElement('span');
    marker.textContent = '​';
    mirrorDiv.appendChild(marker);

    var markerRect = marker.getBoundingClientRect();
    var mirrorRect = mirrorDiv.getBoundingClientRect();
    var lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.4;

    return {
      top: markerRect.top - mirrorRect.top - ta.scrollTop,
      left: markerRect.left - mirrorRect.left - ta.scrollLeft,
      lineHeight: lineHeight
    };
  }

  function positionPopover(popoverEl) {
    var ta = dom.noteSource;
    var caret = getCaretPixelPosition(ta);
    var containerRect = dom.editorBody.getBoundingClientRect();
    var taRect = ta.getBoundingClientRect();
    var offsetX = taRect.left - containerRect.left;
    var offsetY = taRect.top - containerRect.top;

    var left = offsetX + caret.left;
    var top = offsetY + caret.top + caret.lineHeight + 4;

    var maxLeft = dom.editorBody.clientWidth - popoverEl.offsetWidth - 8;
    if (left > maxLeft) left = Math.max(8, maxLeft);

    var maxTop = dom.editorBody.clientHeight - popoverEl.offsetHeight - 8;
    if (top > maxTop) top = offsetY + caret.top - popoverEl.offsetHeight - 4;

    popoverEl.style.left = left + 'px';
    popoverEl.style.top = Math.max(4, top) + 'px';
  }



  function showPopover(popoverEl) {
    popoverEl.hidden = false;
    positionPopover(popoverEl);
  }

  function hidePopover(popoverEl) {
    if (popoverEl.hidden) return;
    popoverEl.hidden = true;
    popoverEl.innerHTML = '';
    if (autocompleteContext &&
      ((popoverEl === dom.wordSuggestPopover && autocompleteContext.type === 'word') ||
        (popoverEl === dom.linkSuggestPopover && autocompleteContext.type === 'link'))) {
      autocompleteContext = null;
    }
  }

  function closeAllPopovers() {
    hidePopover(dom.wordSuggestPopover);
    hidePopover(dom.linkSuggestPopover);
  }

  function setActivePopoverItem(items, idx) {
    items.forEach(function (it, i) { it.classList.toggle('active', i === idx); });
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  function handlePopoverKeydown(e, popoverEl, acceptFn) {
    var items = popoverEl.querySelectorAll('.autocomplete-item');
    if (!items.length) return false;

    var activeIdx = -1;
    items.forEach(function (it, i) { if (it.classList.contains('active')) activeIdx = i; });

    if (e.key === 'ArrowDown') { e.preventDefault(); setActivePopoverItem(items, (activeIdx + 1) % items.length); return true; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActivePopoverItem(items, (activeIdx - 1 + items.length) % items.length); return true; }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      acceptFn(items[activeIdx === -1 ? 0 : activeIdx].getAttribute('data-value'));
      return true;
    }
    if (e.key === 'Escape') { e.preventDefault(); closeAllPopovers(); return true; }
    return false;
  }

  function wirePopoverMouseEvents(popoverEl, acceptFn) {
    popoverEl.querySelectorAll('.autocomplete-item').forEach(function (item) {
      item.addEventListener('mousedown', function (e) { e.preventDefault(); });
      item.addEventListener('click', function () { acceptFn(item.getAttribute('data-value')); });
      item.addEventListener('mouseenter', function () {
        popoverEl.querySelectorAll('.autocomplete-item').forEach(function (it) { it.classList.remove('active'); });
        item.classList.add('active');
      });
    });
  }



  function buildWordIndex() {
    var freq = Object.create(null);
    state.notes.forEach(function (n) {
      var words = (n.body || '').match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
      words.forEach(function (w) {
        var key = w.toLowerCase();
        freq[key] = (freq[key] || 0) + 1;
      });
    });
    state.wordIndex = freq;
  }

  function detectWordQuery(value, caret) {
    var i = caret;
    while (i > 0 && /[A-Za-z'-]/.test(value.charAt(i - 1))) i--;
    var word = value.slice(i, caret);
    return word.length < 3 ? null : { query: word, start: i, end: caret };
  }

  function showWordSuggestions(q) {
    var query = q.query.toLowerCase();
    var matches = Object.keys(state.wordIndex)
      .filter(function (w) { return w !== query && w.indexOf(query) === 0; })
      .sort(function (a, b) { return state.wordIndex[b] - state.wordIndex[a] || a.length - b.length; })
      .slice(0, 6);

    if (!matches.length) { hidePopover(dom.wordSuggestPopover); return; }

    autocompleteContext = { type: 'word', start: q.start, end: q.end };
    dom.wordSuggestPopover.innerHTML = matches.map(function (w, i) {
      return '<button type="button" class="autocomplete-item' + (i === 0 ? ' active' : '') + '" data-value="' + escapeHtml(w) + '">' + escapeHtml(w) + '</button>';
    }).join('');
    wirePopoverMouseEvents(dom.wordSuggestPopover, acceptWordSuggestion);
    showPopover(dom.wordSuggestPopover);
  }

  function acceptWordSuggestion(word) {
    if (!autocompleteContext || autocompleteContext.type !== 'word') return;
    var ta = dom.noteSource;
    var value = ta.value;
    var insert = word + ' ';
    ta.value = value.slice(0, autocompleteContext.start) + insert + value.slice(autocompleteContext.end);
    var pos = autocompleteContext.start + insert.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    hidePopover(dom.wordSuggestPopover);
    persistActiveNoteEdits();
  }



  function detectLinkQuery(value, caret) {
    var lineStart = value.lastIndexOf('\n', caret - 1) + 1;
    var linePrefix = value.slice(lineStart, caret);
    var openIdx = linePrefix.lastIndexOf('[[');
    if (openIdx === -1) return null;
    var between = linePrefix.slice(openIdx + 2);
    if (between.indexOf(']]') !== -1) return null;
    return { query: between, start: lineStart + openIdx, end: caret };
  }

  function showLinkSuggestions(q) {
    var query = q.query.toLowerCase();
    var matches = state.notes.filter(function (n) {
      return n.id !== state.activeId && (n.title || 'Untitled note').toLowerCase().indexOf(query) !== -1;
    }).slice(0, 6);

    if (!matches.length) { hidePopover(dom.linkSuggestPopover); return; }

    autocompleteContext = { type: 'link', start: q.start, end: q.end };
    dom.linkSuggestPopover.innerHTML = matches.map(function (n, i) {
      return '<button type="button" class="autocomplete-item' + (i === 0 ? ' active' : '') + '" data-value="' + n.id + '">' +
        ICONS.fileText + '<span>' + escapeHtml(n.title || 'Untitled note') + '</span></button>';
    }).join('');
    wirePopoverMouseEvents(dom.linkSuggestPopover, acceptLinkSuggestion);
    showPopover(dom.linkSuggestPopover);
  }

  function acceptLinkSuggestion(noteId) {
    if (!autocompleteContext || autocompleteContext.type !== 'link') return;
    var note = findNote(noteId);
    if (!note) return;
    var ta = dom.noteSource;
    var value = ta.value;
    var insert = '[' + (note.title || 'Untitled note') + '](#note-' + note.id + ')';
    ta.value = value.slice(0, autocompleteContext.start) + insert + value.slice(autocompleteContext.end);
    var pos = autocompleteContext.start + insert.length;
    ta.setSelectionRange(pos, pos);
    ta.focus();
    hidePopover(dom.linkSuggestPopover);
    persistActiveNoteEdits();
  }

  function handleAutocompleteInput() {
    var ta = dom.noteSource;
    if (ta.selectionStart !== ta.selectionEnd) { closeAllPopovers(); return; }
    var value = ta.value;
    var caret = ta.selectionStart;

    var linkQuery = detectLinkQuery(value, caret);
    if (linkQuery !== null) {
      hidePopover(dom.wordSuggestPopover);
      showLinkSuggestions(linkQuery);
      return;
    }

    hidePopover(dom.linkSuggestPopover);
    var wordQuery = detectWordQuery(value, caret);
    if (wordQuery) showWordSuggestions(wordQuery);
    else hidePopover(dom.wordSuggestPopover);
  }



  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportAllData() {
    var payload = { notes: state.notes };
    downloadFile('notebuddy-export.json', JSON.stringify(payload, null, 2), 'application/json');
  }

  function showImportError() {
    openInfoModal('Import Failed', 'Could not import that file. Make sure it is a NoteBuddy JSON export.');
  }

  function openImportConflictModal(onReplace, onAppend) {
    var html =
      '<p class="modal-message">You already have notes saved. Append the imported notes to what you have, ' +
      'or clean up and replace everything with the imported file?</p>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="btnImportAppend">Append</button>' +
      '<button class="btn btn-danger" id="btnImportReplace">Cleanup &amp; Replace</button>' +
      '</div>';
    openModal('Import Data', html, function (body) {
      body.querySelector('#btnImportAppend').addEventListener('click', function () {
        closeModal();
        onAppend();
      });
      body.querySelector('#btnImportReplace').addEventListener('click', function () {
        closeModal();
        onReplace();
      });
    }, { autoSize: true });
  }



  function remapPayload(data) {
    var incomingNotes = Array.isArray(data.notes) ? data.notes : (Array.isArray(data) ? data : []);

    var idMap = {};
    var newNotes = incomingNotes.map(function (n) {
      var nn = {
        id: generateId(),
        title: n.title ? String(n.title) : '',
        body: n.body ? String(n.body) : '',
        createdAt: n.createdAt || Date.now(),
        updatedAt: n.updatedAt || Date.now()
      };
      if (n.id) idMap[n.id] = nn.id;
      return nn;
    });

    newNotes.forEach(function (n) {
      n.body = n.body.replace(/#note-([A-Za-z0-9_-]+)/g, function (match, oldId) {
        return idMap[oldId] ? '#note-' + idMap[oldId] : match;
      });
    });

    return newNotes;
  }

  function applyImportedData(newNotes, replaceExisting) {
    if (replaceExisting) {
      state.notes = newNotes;
    } else {
      state.notes = state.notes.concat(newNotes);
    }
    saveNotes();
    buildWordIndex();
    if (!state.activeId || !findNote(state.activeId)) {
      var sorted = sortedNotes();
      state.activeId = sorted.length ? sorted[0].id : null;
      saveActiveId();
    }
    renderNoteList();
    renderEditor();
  }

  function importDataFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        showImportError();
        return;
      }

      if (!data || (!Array.isArray(data) && !Array.isArray(data.notes))) {
        showImportError();
        return;
      }

      var remapped = remapPayload(data);
      var hasExistingData = state.notes.length > 0;
      if (hasExistingData) {
        openImportConflictModal(
          function () { applyImportedData(remapped, true); },
          function () { applyImportedData(remapped, false); }
        );
      } else {
        applyImportedData(remapped, false);
      }
    };
    reader.readAsText(file);
  }

  function handleLoadSample(e) {
    e.preventDefault();
    if (window.location.protocol === 'file:') {
      openInfoModal(
        'Server Required',
        'Loading sample data needs the app to be served from a local or remote server — it can\'t read local files when index.html is opened directly from your file system. Instead, download noteBuddy_sample.json from cdnBuddy/samples and use the Import button (top-left) to load it.'
      );
      return;
    }
    fetch('https://isafuianish-dev.github.io/webapp_cdnBuddy/samples/noteBuddy_sample.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then(function (parsed) {
        if (!parsed || !Array.isArray(parsed.notes) || !parsed.notes.length) throw new Error('Invalid data');
        applyImportedData(remapPayload(parsed), false);
      })
      .catch(function () {
        openInfoModal('Load Failed', 'Could not load the sample data.');
      });
  }



  var modalApi = Buddy.modal.init();
  var openModal = modalApi.open;
  var closeModal = modalApi.close;

  function openConfirmModal(title, message, confirmLabel, onConfirm, opts) {
    opts = opts || {};
    var danger = opts.danger ? 'btn-danger' : 'btn-primary';
    var html =
      '<p class="modal-message">' + escapeHtml(message) + '</p>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="btnConfirmNo">Cancel</button>' +
      '<button class="btn ' + danger + '" id="btnConfirmYes">' + escapeHtml(confirmLabel) + '</button>' +
      '</div>';
    openModal(title, html, function (body) {
      body.querySelector('#btnConfirmNo').addEventListener('click', closeModal);
      body.querySelector('#btnConfirmYes').addEventListener('click', function () {
        closeModal();
        onConfirm();
      });
    }, { autoSize: true });
  }

  function openSettingsModal() {
    Buddy.settings.open(APP_KEY, openModal, closeModal, { appVersion: APP_VERSION });
  }
})();
