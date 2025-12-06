import { supabase } from './supabase.js';
import { refreshSession } from './auth-utils.js';

let orders = [];
let filtered = [];
let page = 1;
const pageSize = 10;
let currentFilter = 'all';
let sort = 'date_desc';
let timeRange = 'all';
let searchQuery = '';

const bodyEl = document.getElementById('orders-body');
const paginationInfoEl = document.getElementById('pagination-info');

document.addEventListener('DOMContentLoaded', async () => {
  const user = await refreshSession(true);
  if (!user) return;
  await loadOrders(user.id);
  setupUI();
  applyFilters();
});

async function loadOrders(userId) {
  const { data: orderData, error } = await supabase
    .from('orders')
    .select('id, order_number, created_at, total_amount, status, payment_method, shipping_address')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !orderData) {
    orders = [];
    return;
  }

  const orderIds = orderData.map(o => o.id);
  let itemsByOrder = {};
  if (orderIds.length) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('order_id, quantity, price, products:product_id (name, image_url)')
      .in('order_id', orderIds);
    (itemsData || []).forEach(it => {
      if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
      itemsByOrder[it.order_id].push(it);
    });
  }

  orders = orderData.map(o => ({
    ...o,
    items: itemsByOrder[o.id] || [],
    shipping: parseShipping(o.shipping_address)
  }));
}

function setupUI() {
  document.querySelectorAll('.pill[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      page = 1;
      applyFilters();
    });
  });
  document.getElementById('status-select').addEventListener('change', e => { currentFilter = e.target.value; page = 1; applyFilters(); });
  document.getElementById('time-select').addEventListener('change', e => { timeRange = e.target.value; page = 1; applyFilters(); });
  document.getElementById('sort-select').addEventListener('change', e => { sort = e.target.value; applyFilters(); });
  document.getElementById('search-input').addEventListener('input', e => { searchQuery = e.target.value.toLowerCase().trim(); page = 1; applyFilters(); });
  document.getElementById('prev-page').addEventListener('click', () => { if (page > 1) { page--; render(); } });
  document.getElementById('next-page').addEventListener('click', () => { const max = Math.ceil(filtered.length / pageSize); if (page < max) { page++; render(); } });
}

function mapCategory(status) {
  const s = (status || '').toLowerCase();
  if (['pending', 'unpaid', 'to_pay'].includes(s)) return 'to_pay';
  if (['paid', 'success'].includes(s)) return 'paid';
  if (['processing', 'packaging', 'shipped', 'progress'].includes(s)) return 'progress';
  if (['delivered', 'completed', 'success_receive', 'receive'].includes(s)) return 'success';
  if (['review', 'awaiting_review', 'review_pending'].includes(s)) return 'review';
  if (['cancelled', 'void', 'failed'].includes(s)) return 'cancelled';
  return 'other';
}

function formatId(id) { return (id || '').toString().toUpperCase(); }
function formatDate(d) { const dt = new Date(d); return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }
function formatPrice(num) { return new Intl.NumberFormat('id-ID').format(Math.round(num || 0)); }

function parseShipping(addr) {
  if (!addr) return {};
  try {
    const obj = typeof addr === 'string' ? JSON.parse(addr) : addr;
    return obj || {};
  } catch {
    return {};
  }
}

function applyFilters() {
  filtered = orders.filter(o => {
    const cat = mapCategory(o.status);
    const matchCat = currentFilter === 'all' ? true : cat === currentFilter;
    const now = Date.now();
    const created = new Date(o.created_at).getTime();
    const matchTime = timeRange === 'all' ? true : (now - created) <= parseInt(timeRange) * 24 * 60 * 60 * 1000;
    const matchSearch = !searchQuery ||
      (o.order_number && o.order_number.toLowerCase().includes(searchQuery)) ||
      (o.items || []).some(it => (it.products?.name || '').toLowerCase().includes(searchQuery));
    return matchCat && matchTime && matchSearch;
  });
  sortFiltered();
  render();
}

function sortFiltered() {
  if (sort === 'date_desc') filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  if (sort === 'date_asc') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  if (sort === 'amount_desc') filtered.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
  if (sort === 'amount_asc') filtered.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
}

function statusBadge(status) {
  const cat = mapCategory(status);
  const label = ({
    to_pay: 'Pending',
    paid: 'Paid',
    progress: 'Progress',
    success: 'Selesai',
    review: 'Review',
    cancelled: 'Cancelled'
  })[cat] || status;
  // Ensure capitalization
  const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
  return `<span class="badge ${cat}">${capLabel}</span>`;
}

function isCancelable(status) {
  const s = (status || '').toLowerCase();
  return ['pending', 'unpaid', 'to_pay', 'paid'].includes(s);
}

function render() {
  const start = (page - 1) * pageSize;
  const rows = filtered.slice(start, start + pageSize).map(o => `
    <tr>
      <td class="px-4 py-3"><button class="text-order-id hover:text-secondary transition-colors" data-view="${o.order_number}">#${formatId(o.order_number)}</button></td>
      <td class="px-4 py-3 text-gray-600">${formatDate(o.created_at)}</td>
      <td class="px-4 py-3 text-amount">Rp ${formatPrice(o.total_amount)}</td>
      <td class="px-4 py-3">${statusBadge(o.status)}</td>
      <td class="px-4 py-3">
        <button class="text-sm font-medium text-secondary hover:text-purple-700 mr-3 transition-colors" data-details="${o.order_number}">Details</button>
        ${isCancelable(o.status) ? `<button class="text-sm font-medium text-red-500 hover:text-red-700 transition-colors" data-cancel="${o.order_number}">Cancel</button>` : ''}
      </td>
    </tr>
  `).join('');
  bodyEl.innerHTML = rows || `<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">Tidak ada pesanan</td></tr>`;
  const max = Math.ceil(filtered.length / pageSize) || 1;
  paginationInfoEl.textContent = `Showing ${filtered.length ? start + 1 : 0} to ${Math.min(start + pageSize, filtered.length)} of ${filtered.length} orders`;
  bodyEl.querySelectorAll('[data-details]').forEach(btn => btn.addEventListener('click', () => openDetail(btn.dataset.details)));
  bodyEl.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', () => {
    const o = orders.find(x => x.order_number === btn.dataset.cancel);
    if (o && isCancelable(o.status)) openConfirm(o);
  }));
}

async function openDetail(orderNumber) {
  let order = orders.find(o => o.order_number === orderNumber);
  if (!order) {
    const { data, error } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
    if (error || !data) return;
    order = { ...data, shipping: parseShipping(data.shipping_address) };
  }
  document.getElementById('modal-order-number').textContent = orderNumber;
  let items = order.items;
  if (!items || !items.length) {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('quantity, price, products:product_id (name, image_url)')
      .eq('order_id', order.id);
    items = itemsData || [];
  }
  const itemsHtml = (items || []).map(it => `
    <div class="flex items-center">
      <img src="${it.products?.image_url || ''}" class="w-14 h-14 rounded mr-3"/>
      <div class="flex-1">
        <div class="font-semibold">${it.products?.name || '-'}</div>
        <div class="text-sm text-gray-600">Rp ${formatPrice(it.price)} x ${it.quantity}</div>
      </div>
    </div>
  `).join('');
  document.getElementById('item-details').innerHTML = itemsHtml || '<div class="text-gray-500 text-sm">Tidak ada item</div>';
  const s = order.shipping || {};
  const shipHtml = `
    <div>Nama: ${s.fullname || '-'}</div>
    <div>Alamat: ${s.address || '-'}</div>
    <div>Kecamatan/Kota/Provinsi: ${[s.district, s.city, s.province].filter(Boolean).join(', ') || '-'}</div>
    <div>Kode Pos: ${s.postalCode || '-'}</div>
    <div>HP: ${s.phone || '-'}</div>
    <div>Email: ${s.email || '-'}</div>
  `;
  document.getElementById('shipping-info').innerHTML = shipHtml;
  const payHtml = `
    <div>Metode: ${order.payment_method || '-'}</div>
    <div>Status: ${order.status || '-'}</div>
    <div>ID Transaksi: ${order.order_number}</div>
    <div>Total: Rp ${formatPrice(order.total_amount || 0)}</div>
  `;
  document.getElementById('payment-info').innerHTML = payHtml;
  const allowedCancel = isCancelable(order.status);
  const cancelEl = document.getElementById('cancel-actions');
  cancelEl.innerHTML = allowedCancel ? `
    <button id="cancel-order" class="w-full gradient-bg text-white font-semibold px-4 py-2 rounded-xl">Batalkan Pesanan</button>
    <p class="text-xs text-gray-500 mt-2">Pembatalan tersedia untuk status To Pay dan Paid</p>
  ` : '';
  if (allowedCancel) {
    document.getElementById('cancel-order').addEventListener('click', () => cancelOrder(order));
  }
  const modal = document.getElementById('order-modal');
  modal.style.display = 'flex';
  document.getElementById('modal-close').onclick = () => { modal.style.display = 'none'; };
  window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

async function cancelOrder(order) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    let apiOk = false;
    if (token) {
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ order_number: order.order_number, reason: 'User requested cancellation' })
      }).catch(() => null);
      const result = await (res ? res.json().catch(() => ({ status: 'error' })) : { status: 'error' });
      apiOk = result && result.status === 'success';
    }

    if (!apiOk) {
      const s = (order.status || '').toLowerCase();
      if (!['pending', 'unpaid', 'to_pay', 'paid'].includes(s)) {
        return false;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date() }).eq('id', order.id);
      if (userId) {
        await supabase.from('cancellations').insert({ order_id: order.id, user_id: userId, reason: 'cancel', refund_required: ['paid'].includes(s), status: 'requested', created_at: new Date() }).catch(() => null);
        await supabase.from('notifications').insert({ type: 'order_cancelled', title: 'Order dibatalkan', message: `Order ${order.order_number} dibatalkan`, meta: { order_id: order.id }, created_at: new Date(), audience: 'admin' }).catch(() => null);
      }
    }

    const modal = document.getElementById('order-modal');
    if (modal) modal.style.display = 'none';
    const idx = orders.findIndex(o => o.order_number === order.order_number);
    if (idx >= 0) orders[idx].status = 'cancelled';
    applyFilters();
    return true;
  } catch (e) {
    console.error('Cancel failed', e);
    return false;
  }
}

function openConfirm(order) {
  const overlay = document.getElementById('confirm-modal');
  const yesBtn = document.getElementById('confirm-yes');
  const noBtn = document.getElementById('confirm-no');
  if (!overlay || !yesBtn || !noBtn) { cancelOrder(order); return; }
  overlay.style.display = 'flex';
  overlay.classList.add('opacity-0');
  setTimeout(() => { overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100'); }, 10);

  const onYes = async () => {
    yesBtn.disabled = true;
    const ok = await cancelOrder(order);
    closeConfirm();
    if (ok) showSuccess('Pesanan berhasil dibatalkan');
    yesBtn.disabled = false;
  };
  const onNo = () => { closeConfirm(); window.history.back(); };
  yesBtn.onclick = onYes;
  noBtn.onclick = onNo;
  window.onclick = (e) => { if (e.target === overlay) closeConfirm(); };
}

function closeConfirm() {
  const overlay = document.getElementById('confirm-modal');
  if (!overlay) return;
  overlay.classList.remove('opacity-100');
  overlay.classList.add('opacity-0');
  setTimeout(() => { overlay.style.display = 'none'; }, 200);
}

function showToast(message) {
  const el = document.getElementById('ra-toast');
  if (!el) return;
  el.textContent = message;
  el.className = 'fixed top-24 right-4 z-50 px-4 py-3 rounded-lg shadow-lg bg-secondary text-white transition-opacity duration-300';
  el.style.opacity = '0';
  el.classList.remove('hidden');
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.classList.add('hidden'); }, 300);
  }, 3000);
}

function showSuccess(message) {
  const overlay = document.getElementById('success-modal');
  const msg = document.getElementById('success-message');
  if (!overlay) return showToast(message || 'Pesanan berhasil dibatalkan');
  if (msg) msg.textContent = message || 'Pesanan Anda telah dibatalkan.';
  overlay.style.display = 'flex';
  overlay.classList.add('transition-opacity', 'duration-200');
  overlay.classList.add('opacity-0');
  setTimeout(() => { overlay.classList.remove('opacity-0'); overlay.classList.add('opacity-100'); }, 10);
  setTimeout(() => {
    overlay.classList.remove('opacity-100');
    overlay.classList.add('opacity-0');
    setTimeout(() => { overlay.style.display = 'none'; }, 200);
  }, 3000);
}

window.addEventListener('resize', () => { render(); });
