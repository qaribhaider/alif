import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs';
import { Validator } from '../src/core/validator.js';
import { Config } from '../src/core/config-schema.js';
import { logger } from '../src/core/logger.js';

describe('Pre-flight Validator', () => {
  let mockConfig: Config;
  let mockFeedsPath: string;

  beforeEach(() => {
    mockFeedsPath = '/tmp/mock-feeds.json';
    mockConfig = {
      llm: { provider: 'ollama', model: 'llama2' },
      delivery: [],
      preferences: {
        signalThreshold: 60,
        maxItemsPerRun: 10,
        sourceCooldownMinutes: 5,
        sequentialAnalysis: false,
        enableAIArticlesScoring: true,
        customKeywords: {},
        negativeKeywords: {},
        logLevel: 'normal',
        noColor: false,
      },
      dbPath: '/tmp/db.sqlite',
      feedsPath: mockFeedsPath,
    };

    vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(mockFeedsPath)) fs.unlinkSync(mockFeedsPath);
  });

  describe('LLM Validation', () => {
    it('passes if provider is ollama without api key', () => {
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();
      expect(failures.find((f) => f.scope === 'LLM')).toBeUndefined();
    });

    it('fails if provider is anthropic and api key is missing', () => {
      mockConfig.llm.provider = 'anthropic';
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      const llmfail = failures.find((f) => f.scope === 'LLM');
      expect(llmfail).toBeDefined();
      expect(llmfail?.message).toContain('requires an API key');
    });

    it('fails if provider is openrouter and api key is empty string', () => {
      mockConfig.llm.provider = 'openrouter';
      mockConfig.llm.apiKey = '   ';
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      expect(failures.find((f) => f.scope === 'LLM')).toBeDefined();
    });
  });

  describe('Delivery Validation', () => {
    it('fails if webhook url is malformed', () => {
      mockConfig.delivery = [{ type: 'slack', webhookUrl: 'not-a-real-url' }];
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      const delfail = failures.find((f) => f.scope === 'Delivery');
      expect(delfail).toBeDefined();
      expect(delfail?.message).toContain('malformed webhook URL');
    });

    it('passes if valid webhook url is provided', () => {
      mockConfig.delivery = [
        { type: 'slack', webhookUrl: 'https://hooks.slack.com/services/test' },
      ];
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();
      expect(failures.find((f) => f.scope === 'Delivery')).toBeUndefined();
    });
  });

  describe('Feeds Validation', () => {
    it('fails if feeds.json is not an array', () => {
      fs.writeFileSync(mockFeedsPath, JSON.stringify({ url: 'test' }));
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      expect(failures.find((f) => f.scope === 'Feeds')?.message).toContain('must contain an array');
    });

    it('fails if a feed lacks a url', () => {
      fs.writeFileSync(mockFeedsPath, JSON.stringify([{ type: 'rss' }]));
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      expect(failures.find((f) => f.scope === 'Feeds')?.message).toContain("missing a 'url'");
    });

    it('fails if a feed has an invalid type', () => {
      fs.writeFileSync(
        mockFeedsPath,
        JSON.stringify([{ type: 'magical', url: 'https://test.com' }]),
      );
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      expect(failures.find((f) => f.scope === 'Feeds')?.message).toContain(
        "invalid or missing 'type'",
      );
    });

    it('passes with fully valid feeds', () => {
      fs.writeFileSync(
        mockFeedsPath,
        JSON.stringify([
          { type: 'rss', url: 'https://test.com/rss' },
          { type: 'json', url: 'https://test.com/json' },
        ]),
      );
      const validator = new Validator(mockConfig, mockFeedsPath);
      const failures = validator.validate();

      expect(failures.find((f) => f.scope === 'Feeds')).toBeUndefined();
    });
  });
});
