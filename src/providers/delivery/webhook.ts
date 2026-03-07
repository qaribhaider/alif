import axios from 'axios';
import { DeliveryProvider, Digest } from './index.js';
import { logger } from '../../core/logger.js';

export class WebhookDelivery implements DeliveryProvider {
  constructor(private webhookUrl: string) {}

  async send(digest: Digest): Promise<void> {
    try {
      await axios.post(this.webhookUrl, digest);
    } catch (error) {
      logger.error(
        `[Webhook] Failed to deliver ${digest.items.length} items:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
