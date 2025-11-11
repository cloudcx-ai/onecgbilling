import { storage } from './storage';
import { httpCheck, tcpCheck, icmpCheck } from './health-checks';
import { sendAlert } from './alerts';
import { sendNotification } from './notifications';
import type { Target, CheckResultEvent } from '@shared/schema';
import { WebSocketServer, WebSocket } from 'ws';

const running = new Set<number>();

export function startScheduler(wss: WebSocketServer) {
  console.log('Starting health check scheduler...');
  
  setInterval(async () => {
    try {
      const targets = await storage.getEnabledTargets();
      const now = Math.floor(Date.now() / 1000);

      for (const target of targets) {
        if (running.has(target.id)) continue;
        if (target.frequencySec <= 0) continue;
        if (now % target.frequencySec !== 0) continue;

        running.add(target.id);
        runCheck(target, wss).finally(() => running.delete(target.id));
      }
    } catch (error: any) {
      console.error('Scheduler error:', error.message);
    }
  }, 1000);
}

async function runCheck(target: Target, wss: WebSocketServer) {
  let checkResult;

  try {
    if (target.type === 'HTTP') {
      checkResult = await httpCheck(target.endpoint, target.timeoutMs);
    } else if (target.type === 'TCP') {
      const [host, portStr] = target.endpoint.split(':');
      const port = parseInt(portStr, 10);
      checkResult = await tcpCheck(host, port, target.timeoutMs);
    } else if (target.type === 'ICMP') {
      checkResult = await icmpCheck(target.endpoint, target.timeoutMs);
    } else {
      checkResult = { ok: false, latency: 0, code: 0, message: 'Unknown check type' };
    }
  } catch (e: any) {
    checkResult = { ok: false, latency: 0, code: 0, message: e.message };
  }

  const status = checkResult.ok ? 'UP' : 'DOWN';

  // Store result in database
  await storage.createResult({
    targetId: target.id,
    status,
    latencyMs: checkResult.latency,
    code: checkResult.code || 0,
    message: (checkResult.message || '').slice(0, 500),
  });

  // Broadcast to WebSocket clients
  const event: CheckResultEvent = {
    targetId: target.id,
    name: target.name,
    type: target.type,
    status,
    latency: checkResult.latency,
    code: checkResult.code || 0,
    at: new Date().toISOString(),
  };

  broadcastToClients(wss, event);

  // Check for state change and send alerts through all enabled channels
  const lastResults = await storage.getLastResultsForTarget(target.id, 2);
  if (lastResults.length >= 2) {
    const [latest, previous] = lastResults;
    
    if (latest.status === 'DOWN' && previous.status === 'UP') {
      // Send legacy email alert if configured on target
      if (target.alertEmail) {
        await sendAlert(
          target.alertEmail,
          `⚠️ ${target.name} is DOWN`,
          `<h2>Alert: ${target.name} is DOWN</h2>
           <p><strong>Type:</strong> ${target.type}</p>
           <p><strong>Endpoint:</strong> ${target.endpoint}</p>
           <p><strong>Time:</strong> ${new Date().toISOString()}</p>
           <p><strong>Message:</strong> ${checkResult.message}</p>`
        );
      }

      // Send notifications to all enabled channels
      const channels = await storage.getEnabledNotificationChannels();
      for (const channel of channels) {
        try {
          await sendNotification(channel, {
            targetName: target.name,
            targetType: target.type,
            targetEndpoint: target.endpoint,
            status: 'DOWN',
            message: checkResult.message,
            latency: checkResult.latency,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          console.error(`Failed to send notification via ${channel.name}:`, error.message);
        }
      }
    }
    
    if (latest.status === 'UP' && previous.status === 'DOWN') {
      // Send legacy email alert if configured on target
      if (target.alertEmail) {
        await sendAlert(
          target.alertEmail,
          `✅ ${target.name} has recovered`,
          `<h2>${target.name} is back UP</h2>
           <p><strong>Type:</strong> ${target.type}</p>
           <p><strong>Endpoint:</strong> ${target.endpoint}</p>
           <p><strong>Time:</strong> ${new Date().toISOString()}</p>
           <p><strong>Latency:</strong> ${checkResult.latency}ms</p>`
        );
      }

      // Send notifications to all enabled channels
      const channels = await storage.getEnabledNotificationChannels();
      for (const channel of channels) {
        try {
          await sendNotification(channel, {
            targetName: target.name,
            targetType: target.type,
            targetEndpoint: target.endpoint,
            status: 'UP',
            latency: checkResult.latency,
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          console.error(`Failed to send notification via ${channel.name}:`, error.message);
        }
      }
    }
  }
}

function broadcastToClients(wss: WebSocketServer, event: CheckResultEvent) {
  const message = JSON.stringify({ type: 'check_result', payload: event });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
