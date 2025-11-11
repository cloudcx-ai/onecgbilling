import axios from 'axios';
import * as net from 'net';

export interface CheckResult {
  ok: boolean;
  latency: number;
  code: number;
  message: string;
}

export async function httpCheck(url: string, timeoutMs: number = 5000): Promise<CheckResult> {
  const started = Date.now();
  try {
    const res = await axios.get(url, { 
      timeout: timeoutMs, 
      validateStatus: () => true,
      maxRedirects: 5,
    });
    const latency = Date.now() - started;
    const ok = res.status >= 200 && res.status < 400;
    return { 
      ok, 
      latency, 
      code: res.status, 
      message: res.statusText || `HTTP ${res.status}`
    };
  } catch (e: any) {
    return { 
      ok: false, 
      latency: Date.now() - started, 
      code: 0, 
      message: e.message || 'Request failed'
    };
  }
}

export function tcpCheck(host: string, port: number, timeoutMs: number = 5000): Promise<CheckResult> {
  const started = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    
    const finish = (ok: boolean, message: string) => {
      if (done) return;
      done = true;
      try { socket.destroy(); } catch {}
      resolve({ 
        ok, 
        latency: Date.now() - started, 
        code: ok ? 1 : 0, 
        message 
      });
    };

    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => finish(true, 'connected'));
    socket.on('error', (err) => finish(false, err.message));
    socket.on('timeout', () => finish(false, 'timeout'));
  });
}

// ICMP ping check - not available on Replit (requires native modules)
// Returns a placeholder error message
export async function icmpCheck(host: string, timeoutMs: number = 5000): Promise<CheckResult> {
  const started = Date.now();
  return {
    ok: false,
    latency: Date.now() - started,
    code: 0,
    message: 'ICMP ping not supported on this platform (requires native modules)',
  };
}
