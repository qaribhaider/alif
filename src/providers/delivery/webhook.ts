import axios from 'axios';
import { DeliveryProvider, Digest } from './index.js';

export class WebhookDelivery implements DeliveryProvider {
  constructor(private webhookUrl: string) {}

  async send(digest: Digest): Promise<void> {
    try {
      await axios.post(this.webhookUrl, digest);
    } catch (error) {
      console.error(
        `[Webhook Delivery] Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
}
