import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlackDelivery } from '../src/providers/delivery/slack.js';
import { WebhookDelivery } from '../src/providers/delivery/webhook.js';
import axios from 'axios';

vi.mock('axios');

describe('Delivery Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('SlackDelivery', () => {
    const webhookUrl = 'https://hooks.slack.com/services/test';
    const delivery = new SlackDelivery(webhookUrl);

    it('should send digest to Slack successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({ status: 200, data: 'ok' });

      const digest = {
        items: [
          {
            title: 'Article 1',
            url: 'https://example.com/1',
            summary: 'Summary 1',
            category: 'Research',
            source: 'test',
            score: 80,
          },
        ],
        metadata: {
          total_new_items: 1,
          total_selected: 1,
          date: '2024-03-06',
        },
      };

      await delivery.send(digest);

      expect(axios.post).toHaveBeenCalledWith(webhookUrl, expect.any(Object));
      const payload = vi.mocked(axios.post).mock.calls[0][1] as any;
      expect(payload.blocks).toBeDefined();
      expect(payload.blocks[0].text.text).toContain('AI Signal Digest');
    });

    it('should throw error if Slack delivery fails', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Slack Error'));
      const digest = { items: [], metadata: { total_new_items: 0, total_selected: 0, date: '' } };

      await expect(delivery.send(digest)).rejects.toThrow('Slack Error');
    });
  });

  describe('WebhookDelivery', () => {
    const webhookUrl = 'https://example.com/webhook';
    const delivery = new WebhookDelivery(webhookUrl);

    it('should send generic webhook successfully', async () => {
      vi.mocked(axios.post).mockResolvedValue({ status: 200 });

      const digest = {
        items: [
          {
            title: 'Article 1',
            url: 'https://example.com/1',
            summary: 'Summary 1',
            category: 'Research',
            source: 'test',
          },
        ],
        metadata: { total_new_items: 1, total_selected: 1, date: '2024-03-06' },
      };

      await delivery.send(digest);

      expect(axios.post).toHaveBeenCalledWith(webhookUrl, digest);
    });

    it('should throw error if Webhook delivery fails', async () => {
      vi.mocked(axios.post).mockRejectedValue(new Error('Webhook Error'));
      const digest = { items: [], metadata: { total_new_items: 0, total_selected: 0, date: '' } };

      await expect(delivery.send(digest)).rejects.toThrow('Webhook Error');
    });
  });
});
