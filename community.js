import { supabase } from './js/supabase.js';

const feedEl = document.getElementById('feed');
const inputEl = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const toastEl = document.getElementById('toast');

let likedSet = new Set();
let observer;
let currentUserId = null;

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

function showToast(text) {
  if (!toastEl) return;
  toastEl.textContent = text || 'Tersalin';
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function formatTime(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ts; }
}

function renderReplyItem(rep) {
  const u = rep.username || 'User';
  const t = formatTime(rep.created_at);
  return `
    <div class="reply-card">
      <div class="flex items-start gap-2">
        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700">${(u || 'U').substring(0, 1).toUpperCase()}</div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-900 text-sm">${u}</span>
            <span class="text-[11px] text-gray-500">${t}</span>
          </div>
          <div class="mt-1 text-gray-800 text-sm whitespace-pre-wrap break-words">${rep.reply || ''}</div>
        </div>
      </div>
    </div>
  `;
}

function renderMessageCard(msg, replies = [], isLiked = false) {
  const username = msg.username || 'User';
  const time = formatTime(msg.created_at);
  const likeCount = Number(msg.like_count || 0);
  const viewCount = Number(msg.view_count || 0);
  const repliesHtml = replies.map(renderReplyItem).join('');
  const isOwner = !!currentUserId && (msg.user_id === currentUserId);
  const formatted = formatMessageHtml(msg.message || '');
  return `
    <article class="feed-card" data-message-id="${msg.id}" data-user-id="${msg.user_id || ''}">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-700">${(username || 'U').substring(0, 1).toUpperCase()}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900">${username}</span>
              <span class="text-xs text-gray-500">${time}</span>
            </div>
            <div class="relative">
              <button class="menu-btn text-gray-600 hover:text-gray-800" title="Menu" aria-haspopup="true"><i data-feather="more-horizontal" class="w-5 h-5"></i></button>
              <div class="menu-dropdown hidden absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button class="menu-copy w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Salin Teks</button>
                <button class="menu-report w-full text-left px-3 py-2 text-sm hover:bg-gray-50">Laporkan</button>
                ${isOwner ? `<button class="menu-delete w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Hapus</button>` : ''}
              </div>
            </div>
          </div>
          <div class="mt-2 text-gray-800 text-sm break-words">${formatted}</div>
          <div class="mt-3 flex items-center gap-4 text-sm">
            <button class="like-btn inline-flex items-center gap-2" data-liked="${isLiked ? 'true' : 'false'}">
              <svg class="heart w-5 h-5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              <span class="like-count">${likeCount}</span>
            </button>
            <span class="text-gray-500 text-xs views">${viewCount} views</span>
            <button class="reply-btn inline-flex items-center gap-1 text-gray-700 hover:text-secondary text-xs"><i data-feather="corner-up-right" class="w-4 h-4"></i>Reply</button>
          </div>
          <div class="reply-input hidden mt-3">
            <div class="flex items-start gap-2">
              <textarea class="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none text-sm" rows="2" placeholder="Tulis balasan..."></textarea>
              <button class="send-reply bg-secondary hover:bg-pink-600 text-white font-semibold px-4 py-2 rounded-full">Kirim</button>
            </div>
          </div>
          ${repliesHtml ? `<div class="reply-thread">${repliesHtml}</div>` : ''}
        </div>
      </div>
    </article>
  `;
}

async function loadMessages() {
  const user = await getUser();
  currentUserId = user?.id || null;
  let likedByUser = [];
  if (user) {
    const l = await supabase.from('community_likes').select('message_id').eq('user_id', user.id);
    likedByUser = (l.data || []).map(x => x.message_id);
  }
  likedSet = new Set(likedByUser);
  const { data: messages } = await supabase.from('community_messages').select('*').order('created_at', { ascending: true });
  const ids = (messages || []).map(m => m.id);
  let repliesByMsg = {};
  if (ids.length > 0) {
    const { data: replies } = await supabase.from('community_replies').select('*').in('message_id', ids).order('created_at', { ascending: true });
    for (const r of replies || []) {
      const k = r.message_id;
      if (!repliesByMsg[k]) repliesByMsg[k] = [];
      repliesByMsg[k].push(r);
    }
  }
  let likeCountMap = {};
  if (ids.length > 0) {
    const { data: likeRows } = await supabase.from('community_likes').select('message_id').in('message_id', ids);
    for (const lr of likeRows || []) {
      const k = lr.message_id;
      likeCountMap[k] = (likeCountMap[k] || 0) + 1;
    }
  }
  const html = (messages || []).map(m => {
    const like_count = (likeCountMap[m.id] ?? m.like_count ?? 0);
    const enriched = { ...m, like_count };
    return renderMessageCard(enriched, repliesByMsg[m.id] || [], likedSet.has(m.id));
  }).join('');
  feedEl.innerHTML = html;
  if (typeof feather !== 'undefined') { try { feather.replace(); } catch (_) { } }
  setupObservers(messages || []);
}

async function sendMessage() {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  const text = (inputEl.value || '').trim();
  if (!text) return;
  const username = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email;
  try {
    const { data, error } = await supabase
      .from('community_messages')
      .insert({ user_id: user.id, username, message: text })
      .select('*')
      .single();
    if (error) throw error;
    inputEl.value = '';
    const html = renderMessageCard(data, [], false);
    feedEl.insertAdjacentHTML('beforeend', html);
    const el = feedEl.querySelector(`[data-message-id="${data.id}"]`);
    if (el) {
      el.classList.add('card-pop');
      el.classList.add('highlight-flash');
      try { showSuccessBadge(el); } catch (_) { }
      setTimeout(() => el.classList.remove('card-pop'), 600);
      setTimeout(() => el.classList.remove('highlight-flash'), 1200);
      feedEl.scrollTop = feedEl.scrollHeight;
      observer && observer.observe(el);
    }
  } catch (e) {
    showToast('Gagal mengirim');
    console.error('Send message error:', e);
  }
}

async function toggleLike(messageId) {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  const liked = likedSet.has(messageId);
  if (!liked) {
    const ins = await supabase.from('community_likes').insert({ message_id: messageId, user_id: user.id });
    if (!ins.error) likedSet.add(messageId);
  } else {
    const del = await supabase.from('community_likes').delete().eq('message_id', messageId).eq('user_id', user.id);
    if (!del.error) likedSet.delete(messageId);
  }
  const { count } = await supabase.from('community_likes').select('id', { count: 'exact', head: true }).eq('message_id', messageId);
  await supabase.from('community_messages').update({ like_count: count || 0 }).eq('id', messageId);
  const card = feedEl.querySelector(`[data-message-id="${messageId}"]`);
  if (card) {
    const btn = card.querySelector('.like-btn');
    const cnt = card.querySelector('.like-count');
    if (btn) btn.setAttribute('data-liked', likedSet.has(messageId) ? 'true' : 'false');
    if (cnt) cnt.textContent = String(count || 0);
  }
}

async function sendReply(messageId, text) {
  const user = await getUser();
  if (!user) { window.location.href = 'login.html'; return; }
  const username = user.user_metadata?.display_name || user.user_metadata?.full_name || user.email;
  const { data, error } = await supabase
    .from('community_replies')
    .insert({ message_id: messageId, user_id: user.id, username, reply: text })
    .select('*')
    .single();
  if (error) return;
  const card = feedEl.querySelector(`[data-message-id="${messageId}"]`);
  if (!card) return;
  const thread = card.querySelector('.reply-thread');
  const html = renderReplyItem(data);
  if (thread) {
    thread.insertAdjacentHTML('beforeend', html);
    const last = thread.lastElementChild;
    if (last) {
      last.classList.add('reply-success');
      setTimeout(() => last.classList.remove('reply-success'), 800);
    }
  } else {
    const container = card.querySelector('.flex-1');
    if (container) {
      container.insertAdjacentHTML('beforeend', `<div class="reply-thread">${html}</div>`);
      const last = container.querySelector('.reply-thread .reply-card:last-child');
      if (last) {
        last.classList.add('reply-success');
        setTimeout(() => last.classList.remove('reply-success'), 800);
      }
    }
  }
}

function subscribeRealtime() {
  const ch = supabase.channel('community_live');
  ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages' }, payload => {
    const m = payload.new;
    const html = renderMessageCard(m, [], likedSet.has(m.id));
    feedEl.insertAdjacentHTML('beforeend', html);
    const el = feedEl.querySelector(`[data-message-id="${m.id}"]`);
    if (el) {
      el.classList.add('card-pop');
      el.classList.add('highlight-flash');
      try { showSuccessBadge(el); } catch (_) { }
      setTimeout(() => el.classList.remove('card-pop'), 600);
      setTimeout(() => el.classList.remove('highlight-flash'), 1200);
    }
    if (typeof feather !== 'undefined') { try { feather.replace(); } catch (_) { } }
    feedEl.scrollTop = feedEl.scrollHeight;
  });
  ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_replies' }, payload => {
    const r = payload.new;
    const card = feedEl.querySelector(`[data-message-id="${r.message_id}"]`);
    if (!card) return;
    const thread = card.querySelector('.reply-thread');
    if (thread) {
      thread.insertAdjacentHTML('beforeend', renderReplyItem(r));
    } else {
      const container = card.querySelector('.flex-1');
      if (container) container.insertAdjacentHTML('beforeend', `<div class="reply-thread">${renderReplyItem(r)}</div>`);
    }
  });
  ch.on('postgres_changes', { event: '*', schema: 'public', table: 'community_likes' }, async payload => {
    const msgId = payload.new?.message_id || payload.old?.message_id;
    if (!msgId) return;
    const { count } = await supabase.from('community_likes').select('id', { count: 'exact', head: true }).eq('message_id', msgId);
    const card = feedEl.querySelector(`[data-message-id="${msgId}"]`);
    if (card) {
      const cnt = card.querySelector('.like-count');
      if (cnt) cnt.textContent = String(count || 0);
    }
  });
  // Update listener for messages (like_count, view_count)
  ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_messages' }, payload => {
    const m = payload.new;
    const card = feedEl.querySelector(`[data-message-id="${m.id}"]`);
    if (!card) return;
    const likeEl = card.querySelector('.like-count');
    const viewEl = card.querySelector('.views');
    if (likeEl && typeof m.like_count !== 'undefined') likeEl.textContent = String(m.like_count || 0);
    if (viewEl && typeof m.view_count !== 'undefined') viewEl.textContent = `${Number(m.view_count || 0)} views`;
  });
  ch.on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_messages' }, payload => {
    const old = payload.old;
    const card = feedEl.querySelector(`[data-message-id="${old.id}"]`);
    if (card) {
      card.classList.add('fade-out');
      setTimeout(() => card.remove(), 300);
    }
  });
  ch.subscribe();
}

function setupObservers(messages) {
  if (observer) observer.disconnect();
  const seen = new Set(JSON.parse(localStorage.getItem('community_viewed') || '[]'));
  observer = new IntersectionObserver(async entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        const id = e.target.getAttribute('data-message-id');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        localStorage.setItem('community_viewed', JSON.stringify(Array.from(seen)));
        const { data } = await supabase.from('community_messages').select('view_count').eq('id', id).single();
        const next = Number(data?.view_count || 0) + 1;
        await supabase.from('community_messages').update({ view_count: next }).eq('id', id);
        const card = feedEl.querySelector(`[data-message-id="${id}"]`);
        if (card) {
          const v = card.querySelector('.views');
          if (v) v.textContent = `${next} views`;
        }
      }
    }
  }, { threshold: 0.45 });
  for (const m of messages) {
    const el = feedEl.querySelector(`[data-message-id="${m.id}"]`);
    if (el) observer.observe(el);
  }
}

function showSuccessBadge(card) {
  const badge = document.createElement('div');
  badge.className = 'success-badge';
  badge.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l8.1-8.1 1.4 1.4z"/></svg>';
  card.appendChild(badge);
  setTimeout(() => { try { badge.remove(); } catch (_) { } }, 900);
}

function showPlusOne(btn) {
  const bubble = document.createElement('span');
  bubble.className = 'float-plus';
  bubble.textContent = '+1';
  btn.style.position = 'relative';
  btn.appendChild(bubble);
  setTimeout(() => { try { bubble.remove(); } catch (_) { } }, 900);
}

feedEl.addEventListener('click', async (e) => {
  const menuBtn = e.target.closest('.menu-btn');
  if (menuBtn) {
    const wrapper = menuBtn.parentElement;
    const dd = wrapper?.querySelector('.menu-dropdown');
    if (dd) dd.classList.toggle('hidden');
    return;
  }
  const menuCopy = e.target.closest('.menu-copy');
  if (menuCopy) {
    const card = menuCopy.closest('[data-message-id]');
    const txt = card?.querySelector('.mt-2').textContent || '';
    try { await navigator.clipboard.writeText(txt); showToast('Disalin'); } catch (_) { showToast('Gagal menyalin'); }
    menuCopy.closest('.menu-dropdown')?.classList.add('hidden');
    return;
  }
  const menuReport = e.target.closest('.menu-report');
  if (menuReport) {
    const card = menuReport.closest('[data-message-id]');
    const id = card?.getAttribute('data-message-id');
    const text = card?.querySelector('.mt-2')?.textContent || '';
    try {
      const user = await getUser();
      await supabase.from('community_reports').insert({ message_id: id, reporter_id: user?.id || null, message_text: text });
      showToast('Dilaporkan');
      window.location.href = 'admin/';
    } catch (_) { showToast('Gagal melaporkan'); }
    menuReport.closest('.menu-dropdown')?.classList.add('hidden');
    return;
  }
  const menuDelete = e.target.closest('.menu-delete');
  if (menuDelete) {
    const card = menuDelete.closest('[data-message-id]');
    const id = card?.getAttribute('data-message-id');
    openDeleteModal(id);
    menuDelete.closest('.menu-dropdown')?.classList.add('hidden');
    return;
  }
  const like = e.target.closest('.like-btn');
  if (like) {
    const card = like.closest('[data-message-id]');
    if (!card) return;
    await toggleLike(card.getAttribute('data-message-id'));
    return;
  }
  const replyBtn = e.target.closest('.reply-btn');
  if (replyBtn) {
    const card = replyBtn.closest('[data-message-id]');
    if (!card) return;
    const box = card.querySelector('.reply-input');
    if (box) box.classList.toggle('hidden');
    return;
  }
  const sendReplyBtn = e.target.closest('.send-reply');
  if (sendReplyBtn) {
    const card = sendReplyBtn.closest('[data-message-id]');
    const ta = card?.querySelector('.reply-input textarea');
    const text = (ta?.value || '').trim();
    if (!text || !card) return;
    await sendReply(card.getAttribute('data-message-id'), text);
    ta.value = '';
    card.querySelector('.reply-input')?.classList.add('hidden');
    return;
  }
});

sendBtn.addEventListener('click', sendMessage);

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof feather !== 'undefined') { try { feather.replace(); } catch (_) { } }
  if (typeof AOS !== 'undefined') { try { AOS.init(); } catch (_) { } }
  await loadMessages();
  subscribeRealtime();
  const input = document.getElementById('message-input');
  const emojiBtn = document.getElementById('emoji-btn');
  const boldBtn = document.getElementById('bold-btn');
  const italicBtn = document.getElementById('italic-btn');
  function insertAtCursor(el, str) {
    const start = el.selectionStart || 0; const end = el.selectionEnd || 0;
    const val = el.value; el.value = val.slice(0, start) + str + val.slice(end);
    el.focus(); el.selectionStart = el.selectionEnd = start + str.length;
  }
  emojiBtn && emojiBtn.addEventListener('click', () => insertAtCursor(input, ' 😊 '));
  boldBtn && boldBtn.addEventListener('click', () => {
    const start = input.selectionStart || 0; const end = input.selectionEnd || 0;
    const sel = input.value.slice(start, end) || 'teks';
    const wrapped = `**${sel}**`;
    insertAtCursor(input, wrapped);
  });
  italicBtn && italicBtn.addEventListener('click', () => {
    const start = input.selectionStart || 0; const end = input.selectionEnd || 0;
    const sel = input.value.slice(start, end) || 'teks';
    const wrapped = `*${sel}*`;
    insertAtCursor(input, wrapped);
  });
  document.addEventListener('click', (evt) => {
    const dd = evt.target.closest('.menu-dropdown');
    const btn = evt.target.closest('.menu-btn');
    if (!dd && !btn) {
      document.querySelectorAll('.menu-dropdown').forEach(x => x.classList.add('hidden'));
    }
  });
});

// Delete modal
const deleteModalEl = document.getElementById('delete-modal');
const deleteConfirmBtn = document.getElementById('delete-confirm');
const deleteCancelBtn = document.getElementById('delete-cancel');
let deleteTargetId = null;

function openDeleteModal(id) {
  deleteTargetId = id;
  if (deleteModalEl) deleteModalEl.classList.remove('hidden');
}
function closeDeleteModal() {
  deleteTargetId = null;
  if (deleteModalEl) deleteModalEl.classList.add('hidden');
}
async function performDelete() {
  if (!deleteTargetId) return;
  const user = await getUser();
  if (!user) { showToast('Harus login'); closeDeleteModal(); return; }
  const card = feedEl.querySelector(`[data-message-id="${deleteTargetId}"]`);
  const ownerId = card?.getAttribute('data-user-id');
  if (ownerId !== user.id) { showToast('Anda tidak dapat menghapus pesan ini.'); closeDeleteModal(); return; }
  try {
    const { data, error } = await supabase
      .from('community_messages')
      .delete()
      .eq('id', deleteTargetId)
      .select('id');
    if (error) throw error;
    const stillExists = await supabase.from('community_messages').select('id', { count: 'exact', head: true }).eq('id', deleteTargetId);
    if ((stillExists.count || 0) > 0) throw new Error('Delete failed by policy');
    if (card) {
      card.classList.add('fade-out');
      setTimeout(() => card.remove(), 300);
    }
  } catch (e) {
    console.error('Delete error:', e);
    showToast('Gagal menghapus');
  } finally {
    closeDeleteModal();
  }
}

deleteConfirmBtn && deleteConfirmBtn.addEventListener('click', performDelete);
deleteCancelBtn && deleteCancelBtn.addEventListener('click', closeDeleteModal);
function escapeHtml(str) { return String(str).replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[s])); }
function formatMessageHtml(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*(.+?)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/__([^_]+?)__/g, '<strong>$1</strong>');
  s = s.replace(/_([^_]+?)_/g, '<em>$1</em>');
  s = s.replace(/\n/g, '<br>');
  return s;
}
