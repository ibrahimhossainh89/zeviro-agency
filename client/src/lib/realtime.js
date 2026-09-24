// Socket.IO client helpers: one shared connection for the whole app.
import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

// Re-authenticate the socket after login/logout (the auth cookie changed)
export function reconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket.connect();
}

/** Subscribe to a server event. The handler always sees fresh props/state. */
export function useSocketEvent(event, handler) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const s = getSocket();
    const h = (data) => ref.current?.(data);
    s.on(event, h);
    return () => {
      s.off(event, h);
    };
  }, [event]);
}

/** Join a room now and again after every reconnect. Pass payload=null to skip. */
export function useSocketJoin(event, payload) {
  const key = payload ? JSON.stringify(payload) : '';
  useEffect(() => {
    if (!key) return undefined;
    const s = getSocket();
    const join = () => s.emit(event, JSON.parse(key));
    join();
    s.on('connect', join);
    return () => {
      s.off('connect', join);
    };
  }, [event, key]);
}

/**
 * Typing indicator sender. Call onType() on every keystroke and stop() after sending.
 * Emits typing=true once, then typing=false after 2.5s without keystrokes.
 */
export function useTypingEmitter(event, payload) {
  const typing = useRef(false);
  const timer = useRef(null);
  const key = payload ? JSON.stringify(payload) : '';
  const send = useCallback(
    (value) => {
      if (!key) return;
      getSocket().emit(event, { ...JSON.parse(key), typing: value });
    },
    [event, key]
  );
  const stop = useCallback(() => {
    clearTimeout(timer.current);
    if (typing.current) {
      typing.current = false;
      send(false);
    }
  }, [send]);
  const onType = useCallback(() => {
    if (!typing.current) {
      typing.current = true;
      send(true);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(stop, 2500);
  }, [send, stop]);
  useEffect(() => stop, [stop]); // stop typing when leaving the page
  return { onType, stop };
}

/** Remote typing state → { name, title, avatar } or null. Hides after 5s without new events. */
export function useRemoteTyping() {
  const [who, setWho] = useState(null);
  const timer = useRef(null);
  const update = useCallback((typing, info) => {
    clearTimeout(timer.current);
    if (typing) {
      setWho(typeof info === 'object' && info ? { name: info.name || 'Someone', title: info.title || '', avatar: info.avatar || '' } : { name: info || 'Someone', title: '', avatar: '' });
      timer.current = setTimeout(() => setWho(null), 5000);
    } else setWho(null);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [who, update];
}
