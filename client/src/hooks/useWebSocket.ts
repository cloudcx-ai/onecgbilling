import { useEffect, useState, useCallback } from 'react';
import type { CheckResultEvent } from '@shared/schema';

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<CheckResultEvent | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected');
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'check_result') {
          setLastEvent(data.payload);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  const subscribe = useCallback((callback: (event: CheckResultEvent) => void) => {
    if (!socket) return () => {};
    
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'check_result') {
          callback(data.payload);
        }
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
      }
    };
    
    socket.addEventListener('message', handler);
    
    return () => {
      socket.removeEventListener('message', handler);
    };
  }, [socket]);

  return { isConnected, lastEvent, subscribe };
}
