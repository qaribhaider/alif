import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../src/core/config-manager.js';
import { Config } from '../src/core/config-schema.js';

vi.mock('fs');
vi.mock('os');

describe('ConfigManager', () => {
  const mockConfigDir = '/mock/home/.config/alif';
  const mockConfigFile = path.join(mockConfigDir, 'config.json');
  const mockConfig: Config = {
    llm: {
      provider: 'ollama',
      model: 'llama3',
      baseUrl: 'http://localhost:11434',
    },
    delivery: [{ type: 'slack', webhookUrl: 'https://hooks.slack.com/services/test' }],
    preferences: {
      signalThreshold: 60,
      maxItemsPerRun: 10,
      sourceCooldownMinutes: 5,
      sequentialAnalysis: false,
      enableAIArticlesScoring: true,
      customKeywords: {},
      negativeKeywords: {},
      logLevel: 'normal' as const,
      noColor: false,
    },
    dbPath: path.join(mockConfigDir, 'alif.db'),
    feedsPath: path.join(mockConfigDir, 'feeds.json'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
    // @ts-expect-error - reset singleton for tests
    ConfigManager['instance'] = undefined;
  });

  it('should return correct config paths', () => {
    const manager = ConfigManager.getInstance();
    expect(manager.getConfigDir()).toBe(mockConfigDir);
    expect(manager.getConfigFile()).toBe(mockConfigFile);
  });

  it('should override config path using ALIF_CONFIG_DIR', () => {
    // @ts-expect-error - reset singleton for tests
    ConfigManager['instance'] = undefined;
    process.env.ALIF_CONFIG_DIR = '/custom/config/path';

    const manager = ConfigManager.getInstance();
    expect(manager.getConfigDir()).toBe(path.resolve('/custom/config/path'));
    expect(manager.getConfigFile()).toBe(
      path.join(path.resolve('/custom/config/path'), 'config.json'),
    );

    delete process.env.ALIF_CONFIG_DIR;
  });

  it('should throw if loading non-existent config', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const manager = ConfigManager.getInstance();
    expect(() => manager.load()).toThrow(/Configuration file not found/);
  });

  it('should load and parse valid config', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));

    const manager = ConfigManager.getInstance();
    const loaded = manager.load();
    expect(loaded).toEqual(mockConfig);
  });

  it('should save config and create directory if needed', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const manager = ConfigManager.getInstance();
    manager.save(mockConfig);

    expect(fs.mkdirSync).toHaveBeenCalledWith(mockConfigDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      mockConfigFile,
      expect.stringContaining('"provider": "ollama"'),
      'utf-8',
    );
  });
});

describe('ConfigManager Backward Compatibility', () => {
  const mockConfigDir = '/mock/home/.config/alif';
  const oldConfig = {
    llm: {
      provider: 'ollama',
      model: 'llama3',
      baseUrl: 'http://localhost:11434',
    },
    delivery: [{ type: 'slack', webhookUrl: 'https://hooks.slack.com/services/test' }],
    preferences: {
      signalThreshold: 60,
      maxItemsPerCategory: 5,
      sourceCooldownMinutes: 5,
      sequentialAnalysis: false,
      customKeywords: {},
    },
    dbPath: path.join(mockConfigDir, 'alif.db'),
    feedsPath: path.join(mockConfigDir, 'feeds.json'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(os.homedir).mockReturnValue('/mock/home');
    // @ts-expect-error - reset singleton for tests
    ConfigManager['instance'] = undefined;
  });

  it('could load config with deprecated maxItemsPerCategory and use default maxItemsPerRun', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(oldConfig));

    const manager = ConfigManager.getInstance();
    const loaded = manager.load();

    expect(loaded.preferences.maxItemsPerRun).toBe(10); // Default
    expect(loaded.preferences.maxItemsPerCategory).toBe(5); // Deprecated property is still there
  });
});
