// Real-time layer (Socket.IO): instant chat/message delivery, typing indicators, live notifications.
//
// Rooms
//   user:<id>        every logged-in user (live notifications)
//   agents           staff who can handle website chats (conversation list updates)
//   chat:<convId>    a website chat: the visitor + agents viewing it
//   client:<id>      portal users of a client + staff viewing that client's messages
//   msg-staff        staff who can read client messages (thread list updates)
//   public           everyone (e.g. "team online" status for the chat widget)
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, Client, ChatConversation } from './models/index.js';
import { can } from './config/permissions.js';
import { COOKIE_NAME } from './middleware/auth.js';

let io = null;

export function emit(room, event, data) {
  if (io) io.to(room).emit(event, data);
}
export function emitAll(event, data) {
  if (io) io.emit(event, data);
}

function readCookie(header = '', name) {
  const m = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

async function userFromSocket(socket) {
  const token = readCookie(socket.handshake.headers.cookie, COOKIE_NAME) || socket.handshake.auth?.token;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name role client active title avatar');
    if (!user || !user.active) return null;
    if (user.role === 'client') {
      const c = await Client.findById(user.client).select('status');
      if (!c || c.status !== 'active') return null;
    }
    return user;
  } catch {
    return null;
  }
}

export function initRealtime(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL?.split(',') || true, credentials: true },
    pingInterval: 20000,
    pingTimeout: 20000,
  });

  io.on('connection', async (socket) => {
    socket.join('public');
    const user = await userFromSocket(socket);
    socket.data.user = user;
    if (user) {
      socket.join(`user:${user._id}`);
      if (user.role === 'client') socket.join(`client:${user.client}`);
      else {
        socket.join('staff'); // every team member (project & task updates)
        if (can(user.role, 'chats')) socket.join('agents');
        if (can(user.role, 'messages')) socket.join('msg-staff');
        if (can(user.role, 'orders')) socket.join('order-staff');
        if (can(user.role, 'reviews')) socket.join('review-staff');
      }
    }

    // ---------- website chat ----------
    socket.on('chat:join', async ({ convId, visitorId } = {}) => {
      try {
        const conv = await ChatConversation.findById(convId).select('visitorId');
        if (!conv) return;
        const staffOk = user && user.role !== 'client' && can(user.role, 'chats');
        if (staffOk || (visitorId && conv.visitorId === visitorId)) {
          for (const r of socket.rooms) if (r.startsWith('chat:')) socket.leave(r);
          socket.join(`chat:${convId}`);
          socket.data.visitor = !staffOk;
        }
      } catch {
        /* invalid id */
      }
    });

    socket.on('chat:typing', ({ convId, typing } = {}) => {
      const room = `chat:${convId}`;
      if (!socket.rooms.has(room)) return;
      socket.to(room).emit('chat:typing', {
        convId,
        typing: !!typing,
        who: socket.data.visitor ? 'visitor' : 'agent',
        name: socket.data.visitor ? 'Visitor' : user?.name || 'Agent',
        title: socket.data.visitor ? '' : user?.title || '',
        avatar: socket.data.visitor ? '' : user?.avatar || '',
      });
    });

    // ---------- client portal messages ----------
    socket.on('msg:join', ({ clientId } = {}) => {
      if (!user) return;
      if (user.role === 'client') return; // clients are auto-joined to their own room only
      if (!can(user.role, 'messages')) return;
      for (const r of socket.rooms) if (r.startsWith('client:')) socket.leave(r);
      if (clientId) socket.join(`client:${clientId}`);
    });

    socket.on('msg:typing', ({ clientId, typing } = {}) => {
      if (!user) return;
      const id = user.role === 'client' ? String(user.client) : clientId;
      const room = `client:${id}`;
      if (!socket.rooms.has(room)) return;
      socket.to(room).emit('msg:typing', { clientId: id, typing: !!typing, fromClient: user.role === 'client', name: user.name, title: user.title || '', avatar: user.avatar || '' });
    });
  });

  console.log('[realtime] socket.io ready');
  return io;
}
