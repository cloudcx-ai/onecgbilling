import axios from 'axios';
import { sendAlert } from './alerts';
import type { NotificationChannel } from '@shared/schema';

interface AlertPayload {
  targetName: string;
  targetType: string;
  targetEndpoint: string;
  status: 'UP' | 'DOWN';
  message?: string;
  latency?: number;
  timestamp: string;
}

export async function sendNotification(
  channel: NotificationChannel,
  payload: AlertPayload
): Promise<void> {
  if (!channel.enabled) {
    console.log(`Channel ${channel.name} is disabled, skipping notification`);
    return;
  }

  try {
    let config;
    try {
      config = JSON.parse(channel.config);
    } catch (parseError: any) {
      console.error(`Invalid JSON config for channel ${channel.name}:`, parseError.message);
      return;
    }

    switch (channel.type) {
      case 'email':
        if (!config.email) {
          console.error(`Channel ${channel.name} missing 'email' in config`);
          return;
        }
        await sendEmailNotification(config, payload);
        break;
      case 'slack':
        if (!config.webhookUrl) {
          console.error(`Channel ${channel.name} missing 'webhookUrl' in config`);
          return;
        }
        await sendSlackNotification(config, payload);
        break;
      case 'pagerduty':
        if (!config.routingKey) {
          console.error(`Channel ${channel.name} missing 'routingKey' in config`);
          return;
        }
        await sendPagerDutyNotification(config, payload);
        break;
      case 'webhook':
        if (!config.url) {
          console.error(`Channel ${channel.name} missing 'url' in config`);
          return;
        }
        await sendWebhookNotification(config, payload);
        break;
      default:
        console.error(`Unknown channel type: ${channel.type}`);
    }
  } catch (error: any) {
    console.error(`Failed to send notification via ${channel.name}:`, error.message);
    // Don't re-throw - we want to continue sending to other channels
  }
}

async function sendEmailNotification(config: any, payload: AlertPayload): Promise<void> {
  const { email } = config;
  const subject = payload.status === 'DOWN' 
    ? `⚠️ ${payload.targetName} is DOWN`
    : `✅ ${payload.targetName} has recovered`;
  
  const body = `<h2>${payload.status === 'DOWN' ? 'Alert' : 'Recovery'}: ${payload.targetName}</h2>
    <p><strong>Type:</strong> ${payload.targetType}</p>
    <p><strong>Endpoint:</strong> ${payload.targetEndpoint}</p>
    <p><strong>Status:</strong> ${payload.status}</p>
    <p><strong>Time:</strong> ${payload.timestamp}</p>
    ${payload.message ? `<p><strong>Message:</strong> ${payload.message}</p>` : ''}
    ${payload.latency ? `<p><strong>Latency:</strong> ${payload.latency}ms</p>` : ''}`;

  await sendAlert(email, subject, body);
}

async function sendSlackNotification(config: any, payload: AlertPayload): Promise<void> {
  const { webhookUrl } = config;
  const color = payload.status === 'DOWN' ? 'danger' : 'good';
  const emoji = payload.status === 'DOWN' ? ':warning:' : ':white_check_mark:';

  const message = {
    text: `${emoji} ${payload.targetName} is ${payload.status}`,
    attachments: [
      {
        color,
        fields: [
          { title: 'Target', value: payload.targetName, short: true },
          { title: 'Type', value: payload.targetType, short: true },
          { title: 'Endpoint', value: payload.targetEndpoint, short: false },
          { title: 'Status', value: payload.status, short: true },
          ...(payload.latency ? [{ title: 'Latency', value: `${payload.latency}ms`, short: true }] : []),
          ...(payload.message ? [{ title: 'Message', value: payload.message, short: false }] : []),
        ],
        footer: 'CloudCX Monitor',
        ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
      },
    ],
  };

  await axios.post(webhookUrl, message);
}

async function sendPagerDutyNotification(config: any, payload: AlertPayload): Promise<void> {
  const { routingKey } = config;

  const event = {
    routing_key: routingKey,
    event_action: payload.status === 'DOWN' ? 'trigger' : 'resolve',
    dedup_key: `cloudcx-${payload.targetName}`,
    payload: {
      summary: `${payload.targetName} is ${payload.status}`,
      severity: payload.status === 'DOWN' ? 'error' : 'info',
      source: payload.targetEndpoint,
      timestamp: payload.timestamp,
      custom_details: {
        type: payload.targetType,
        endpoint: payload.targetEndpoint,
        latency: payload.latency,
        message: payload.message,
      },
    },
  };

  await axios.post('https://events.pagerduty.com/v2/enqueue', event);
}

async function sendWebhookNotification(config: any, payload: AlertPayload): Promise<void> {
  const { url, method = 'POST', headers = {} } = config;

  const body = {
    target: payload.targetName,
    type: payload.targetType,
    endpoint: payload.targetEndpoint,
    status: payload.status,
    timestamp: payload.timestamp,
    latency: payload.latency,
    message: payload.message,
  };

  await axios({
    method,
    url,
    headers,
    data: body,
  });
}
