import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, ConfigSchema } from './config-schema.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config | null = null;
  private configDir: string;
  private configFile: string;

  private constructor() {
    this.configDir = process.env.ALIF_CONFIG_DIR
      ? path.resolve(process.env.ALIF_CONFIG_DIR)
      : path.join(os.homedir(), '.config', 'alif');
    this.configFile = path.join(this.configDir, 'config.json');
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getConfigFile(): string {
    return this.configFile;
  }

  load(): Config {
    if (this.config) return this.config;

    if (!fs.existsSync(this.configFile)) {
      throw new Error(`Configuration file not found at ${this.configFile}. Run 'alif init' first.`);
    }

    try {
      const raw = fs.readFileSync(this.configFile, 'utf-8');
      const parsed = JSON.parse(raw);
      this.config = ConfigSchema.parse(parsed);
      return this.config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load configuration: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  save(config: Config): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    try {
      ConfigSchema.parse(config);
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
      this.config = config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save configuration: ${error.message}`, { cause: error });
      }
      throw error;
    }
  }

  exists(): boolean {
    return fs.existsSync(this.configFile);
  }
}
