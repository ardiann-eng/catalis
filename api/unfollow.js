const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://anzsbqqippijhemwxkqh.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q';
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

    const { data: existing } = await supabase
      .from('follows')
      .select('id')
      .eq('user_id', userId)
      .eq('creator_id', creator_id)
      .maybeSingle();
    if (!existing || !existing.id) return res.status(200).json({ status: 'success', already: true });

    const { error: delErr } = await supabase.from('follows').delete().eq('id', existing.id);
    if (delErr) return res.status(500).json({ status: 'error', message: 'Failed to unfollow' });

    return res.status(200).json({ status: 'success' });
  } catch (e) {
    return res.status(500).json({ status: 'error', message: e.message });
  }
};
