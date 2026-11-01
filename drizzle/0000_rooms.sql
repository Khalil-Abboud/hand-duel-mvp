CREATE TABLE rooms (id TEXT PRIMARY KEY, host_token TEXT NOT NULL, guest_token TEXT, created_at INTEGER NOT NULL);
CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id TEXT NOT NULL, sender TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX messages_room ON messages(room_id, id);
