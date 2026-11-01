const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (data, status = 200) => new Response(JSON.stringify(data), {status, headers});
export async function rooms(request, env) {
  if (request.method === 'OPTIONS') return new Response(null, {headers});
  if (request.method !== 'POST') return json({error:'POST required'},405);
  try {
    const body = await request.json();
    const action = new URL(request.url).pathname.split('/').pop();
    const db = env.DB;
    if (action === 'create') {
      const room = crypto.randomUUID(), token = crypto.randomUUID();
      await db.prepare('INSERT INTO rooms (id, host_token, created_at) VALUES (?, ?, ?)').bind(room,token,Date.now()).run();
      return json({room,token});
    }
    const room = await db.prepare('SELECT * FROM rooms WHERE id = ? AND created_at > ?').bind(body.room,Date.now()-86400000).first();
    if (!room) return json({error:'Room not found or expired'},404);
    if (action === 'join') {
      const token = crypto.randomUUID();
      const result = await db.prepare('UPDATE rooms SET guest_token = ? WHERE id = ? AND guest_token IS NULL').bind(token,room.id).run();
      if (!result.meta.changes) return json({error:'Room already has two players'},409);
      return json({room:room.id,token});
    }
    const role = body.token === room.host_token ? 'host' : body.token === room.guest_token ? 'guest' : null;
    if (!role) return json({error:'Invalid session'},403);
    if (action === 'send') {
      const payload = JSON.stringify(body.data);
      if (payload.length > 24000) return json({error:'Message too large'},413);
      await db.prepare('INSERT INTO messages (room_id, sender, payload) VALUES (?, ?, ?)').bind(room.id,role,payload).run();
      return json({ok:true});
    }
    if (action === 'poll') {
      const result = await db.prepare('SELECT id, payload FROM messages WHERE room_id = ? AND sender != ? AND id > ? ORDER BY id LIMIT 100').bind(room.id,role,Number(body.after)||0).all();
      return json({joined:!!room.guest_token,messages:result.results});
    }
    return json({error:'Unknown action'},404);
  } catch (error) { console.error(error); return json({error:'Room service unavailable'},503); }
}
