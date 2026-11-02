// A small Peer-compatible transport over HTTPS. No WebRTC/NAT dependency.
class RelayPeer {
  constructor() {
    this.events = {}; this.id = null; this.token = null; this.destroyed = false;
    this.cursor = 0; this.channel = null; this.timer = null;
    this.ready = this.request('/create', { count: selectedCardCount }).then(data => {
      if (this.destroyed) return;
      this.id = data.room; this.token = data.token; this.emit('open', this.id); this.poll();
    }).catch(error => this.emit('error', error));
  }
  on(name, fn) { (this.events[name] ||= []).push(fn); return this; }
  emit(name, value) { for (const fn of this.events[name] || []) fn(value); }
  async request(path, body) {
    const response = await fetch('https://hand-duel-mvp.grittyblimp1.chatgpt.site/api/rooms' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.error || 'Connection failed'); error.type = response.status === 404 ? 'peer-unavailable' : 'network'; throw error; }
    return data;
  }
  connect(room) {
    const channel = this.makeChannel(); this.channel = channel;
    clearTimeout(this.timer);
    this.request('/join', { room }).then(data => {
      if (this.destroyed) return;
      this.id = room; this.token = data.token; this.cursor = 0;
      channel.open = true; channel.emit('open'); this.poll();
    }).catch(error => this.emit('error', error));
    return channel;
  }
  makeChannel() {
    const owner = this;
    let sends = Promise.resolve();
    return { open: false, events: {},
      on(name, fn) { (this.events[name] ||= []).push(fn); return this; },
      emit(name, data) { for (const fn of this.events[name] || []) fn(data); },
      send(data) {
        const packet = {room: owner.id, token: owner.token, data: structuredClone(data)};
        sends = sends.then(() => owner.request('/send', packet)).catch(error => this.emit('error', error));
      },
      close() { this.open = false; this.emit('close'); }
    };
  }
  async poll() {
    if (this.destroyed || !this.token) return;
    try {
      const data = await this.request('/poll', { room: this.id, token: this.token, after: this.cursor });
      if (this.destroyed) return;
      if (data.joined && !this.channel) {
        this.channel = this.makeChannel(); this.emit('connection', this.channel);
        this.channel.open = true; this.channel.emit('open');
      }
      for (const message of data.messages) {
        this.cursor = message.id;
        this.channel?.emit('data', JSON.parse(message.payload));
      }
    } catch (error) { if (!this.destroyed) this.emit('error', error); }
    if (!this.destroyed) this.timer = setTimeout(() => this.poll(), 500);
  }
  destroy() { this.destroyed = true; clearTimeout(this.timer); }
}
