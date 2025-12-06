const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://anzsbqqippijhemwxkqh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment variables.');
}
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ status: 'error', message: 'Method not allowed' });
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return res.status(401).json({ status: 'error', message: 'Invalid token' });
    const userId = userData.user.id;

    const { creator_id } = req.body || {};
    if (!creator_id) return res.status(400).json({ status: 'error', message: 'Missing creator_id' });
    if (creator_id === userId) return res.status(400).json({ status: 'error', message: 'Cannot follow yourself' });

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('user_id', userId)
      .eq('creator_id', creator_id)
      .maybeSingle();
    if (existing && existing.id) return res.status(200).json({ status: 'success', already: true });

    const { error: insErr } = await supabase
      .from('follows')
      .insert({ user_id: userId, creator_id, created_at: new Date() });
    if (insErr) return res.status(500).json({ status: 'error', message: 'Failed to follow' });

    await supabase
      .from('notifications')
      .insert({ type: 'follow', title: 'New follower', message: 'Anda memiliki follower baru', meta: { creator_id, user_id: userId }, created_at: new Date(), audience: 'creator', target_id: creator_id })
      .catch(() => null);

    return res.status(200).json({ status: 'success' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
