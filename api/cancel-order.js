const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = process.env.SUPABASE_URL || 'https://anzsbqqippijhemwxkqh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'Mid-server-XVdnQPgGcucvnoRJYNWzNw1j';

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ status: 'error', message: 'Invalid token' });
    const userId = userData.user.id;

    const { order_number, reason } = req.body || {};
    if (!order_number) return res.status(400).json({ status: 'error', message: 'Missing order_number' });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, status, total_amount, order_number')
      .eq('order_number', order_number)
      .single();
    if (orderError || !order) return res.status(404).json({ status: 'error', message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ status: 'error', message: 'Forbidden' });

    const s = (order.status || '').toLowerCase();
    const cancellable = ['pending','unpaid','to_pay','paid','success'].includes(s) && !['processing','shipped','completed'].includes(s);
    if (!cancellable) return res.status(400).json({ status: 'error', message: 'Order is not cancellable' });

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date() })
      .eq('id', order.id);
    if (updateError) return res.status(500).json({ status: 'error', message: 'Failed to update order' });

    const { error: cancelLogError } = await supabase
      .from('cancellations')
      .insert({ order_id: order.id, user_id: userId, reason: reason || 'cancel', refund_required: ['paid','success'].includes(s), status: 'requested', created_at: new Date() });
    if (cancelLogError) return res.status(500).json({ status: 'error', message: 'Failed to log cancellation' });

    const { error: notifError } = await supabase
      .from('notifications')
      .insert({ type: 'order_cancelled', title: 'Order dibatalkan', message: `Order ${order_number} dibatalkan`, meta: { order_id: order.id }, created_at: new Date(), audience: 'admin' });
    if (notifError) {}

    let refund = null;
    if (['paid','success'].includes(s)) {
      const midUrl = `https://api.midtrans.com/v2/${order_number}/refund`;
      const resp = await fetch(midUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(MIDTRANS_SERVER_KEY + ':').toString('base64') }, body: JSON.stringify({ refund_key: `cancel_${order_number}`, amount: Math.round(order.total_amount || 0) }) }).catch(() => null);
      refund = resp && (await resp.json().catch(() => null));
      await supabase.from('refund_requests').insert({ order_id: order.id, amount: Math.round(order.total_amount||0), provider: 'midtrans', status: refund?.status_code === '200' ? 'requested' : 'pending', response: refund || {}, created_at: new Date() });
    }

    return res.status(200).json({ status: 'success', refund });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
