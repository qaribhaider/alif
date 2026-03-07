import { Command } from 'commander';
import { LLMTester } from '../../core/debug/llm-tester.js';
import { OllamaProvider } from '../../providers/llm/ollama.js';
import { AnthropicProvider } from '../../providers/llm/anthropic.js';
import { OpenRouterProvider } from '../../providers/llm/openrouter.js';
import { LLMProvider } from '../../providers/llm/index.js';
import { ScraperOrchestrator } from '../../core/orchestrator.js';
import { ConfigManager } from '../../core/config-manager.js';
import fs from 'fs';
import path from 'path';

export const debugCommand = new Command('debug').description('Debug utilities for Alif');

debugCommand
  .command('llm')
  .description('Test and diagnostic for LLM providers')
  .argument('<provider>', 'LLM provider (ollama, anthropic, openrouter)')
  .requiredOption('--model <name>', 'Model name to test')
  .option('--endpoint <url>', 'Base URL/Endpoint (default from config)')
  .option('--key <token>', 'API Key (if required)')
  .option('--sequential', 'Process items one-by-one')
  .option('--score', 'Test Layer 2 AI Article Scoring instead of analysis')
  .action(async (providerName: string, options) => {
    let provider: LLMProvider;

    switch (providerName.toLowerCase()) {
      case 'ollama':
        provider = new OllamaProvider({
          baseUrl: options.endpoint || 'http://localhost:11434',
          model: options.model,
        });
        break;
      case 'anthropic':
        if (!options.key) throw new Error('--key is required for Anthropic');
        provider = new AnthropicProvider({
          apiKey: options.key,
          model: options.model,
        });
        break;
      case 'openrouter':
        if (!options.key) throw new Error('--key is required for OpenRouter');
        provider = new OpenRouterProvider({
          apiKey: options.key,
          model: options.model,
        });
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('LLM DIAGNOSTIC AUDIT TRAIL');
    console.log('='.repeat(50));

    if (options.score) {
      // --- SCORE DEBUG MODE ---
      const SCORE_TEST_TITLES = [
        'OpenAI releases GPT-5 — biggest model leap in three years',
        'DeepSeek V4 open-sourced: beats GPT-4o on 12 benchmarks',
        'Anthropic raises $5B Series E at $75B valuation',
        'Cline 2.0 released: autonomous coding agent with computer use',
        'Top 10 AI tools you should be using in 2025',
        'Sponsored: How Company X saved millions with AI',
        'New EU AI Act enforcement deadlines announced',
        'NVIDIA Blackwell B200 GPUs now available for cloud providers',
        'Google Antigravity adds agentic coding to all tiers',
        'A beginner tutorial on building a RAG pipeline',
      ];

      const startTime = Date.now();
      const scores = await provider.score(SCORE_TEST_TITLES);
      const latency = Date.now() - startTime;

      console.log(`\n[1] SCORING PROMPT SENT: ${SCORE_TEST_TITLES.length} titles`);
      console.log('-'.repeat(30));
      SCORE_TEST_TITLES.forEach((t, i) => console.log(`  ${i}: ${t}`));

      console.log('\n[2] SCORES RETURNED:');
      console.log('-'.repeat(30));
      SCORE_TEST_TITLES.forEach((t, i) => {
        const s = scores[i] ?? '?';
        const bar = '█'.repeat(Math.round(Number(s) / 5));
        console.log(`  ${String(s).padStart(3)}  ${bar.padEnd(20)}  ${t}`);
      });

      console.log('\n[3] LATENCY:');
      console.log('-'.repeat(10));
      console.log(`${latency}ms`);
    } else {
      // --- ANALYSIS DEBUG MODE (existing) ---
      const tester = new LLMTester(provider);
      const { results, debugInfo, totalLatency } = await tester.runTest({
        sequential: options.sequential,
      });

      if (debugInfo) {
        console.log('\n[1] PROMPT SENT TO LLM:');
        console.log('-'.repeat(30));
        console.log(debugInfo.prompt);

        console.log('\n[2] RAW RESPONSE FROM LLM:');
        console.log('-'.repeat(30));
        if (!debugInfo.rawResponse || debugInfo.rawResponse.trim() === '') {
          console.log('<<< EMPTY RESPONSE >>>');
        } else {
          console.log(debugInfo.rawResponse);
        }

        console.log('\n[3] LATENCY:');
        console.log('-'.repeat(10));
        console.log(`${debugInfo.latencyMs}ms`);
      }

      console.log('\n[4] PARSED RESULTS:');
      console.log('-'.repeat(30));
      results.forEach((res, idx) => {
        console.log(`${idx + 1}. [${res.category}] ${res.summary || 'Summary failed'}`);
      });

      console.log('\n' + '='.repeat(50));
      console.log(`TOTAL PROCESS TIME: ${totalLatency}ms`);
      console.log('='.repeat(50));
    }
  });

debugCommand
  .command('audit-feeds')
  .description('Audit all configured feeds for volume and data size')
  .option('--output <path>', 'Custom output path for JSON report')
  .action(async (options) => {
    const configManager = ConfigManager.getInstance();
    if (!configManager.exists()) {
      throw new Error('Alif is not initialized. Run "alif init" first.');
    }

    const config = configManager.load();
    if (!fs.existsSync(config.feedsPath)) {
      throw new Error(`Feeds file not found at ${config.feedsPath}`);
    }

    const feeds = JSON.parse(fs.readFileSync(config.feedsPath, 'utf-8'));
    console.log(`[Diagnostic] Auditing ${feeds.length} feeds...`);

    const orchestrator = new ScraperOrchestrator();
    const startTime = Date.now();
    const results = await orchestrator.runAll(feeds);
    const duration = Date.now() - startTime;

    const auditData = results.map((res) => {
      const totalChars = res.items.reduce(
        (acc, item) => acc + (item.content?.length || 0) + (item.title?.length || 0),
        0,
      );
      return {
        source: res.source,
        status: res.status,
        itemCount: res.items.length,
        totalCharacters: totalChars,
        averageItemSize: res.items.length > 0 ? Math.round(totalChars / res.items.length) : 0,
        error: res.error,
      };
    });

    const summary = {
      totalFeeds: feeds.length,
      successfulFeeds: auditData.filter((d) => d.status === 'ok').length,
      failedFeeds: auditData.filter((d) => d.status === 'error').length,
      totalItems: auditData.reduce((acc, d) => acc + d.itemCount, 0),
      totalCharacters: auditData.reduce((acc, d) => acc + d.totalCharacters, 0),
      durationMs: duration,
      timestamp: new Date().toISOString(),
    };

    const reportPath =
      options.output || path.join(configManager.getConfigDir(), 'audit_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({ summary, details: auditData }, null, 2));

    console.log('\n' + '='.repeat(50));
    console.log('FEED AUDIT SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Feeds:      ${summary.totalFeeds}`);
    console.log(`Successful:       ${summary.successfulFeeds}`);
    console.log(`Failed:           ${summary.failedFeeds}`);
    console.log(`Total Items:      ${summary.totalItems}`);
    console.log(`Total Content:    ${(summary.totalCharacters / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Time taken:       ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(50));
    console.log(`\nDetailed report saved to: ${reportPath}`);
  });
