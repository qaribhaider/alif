import { Command } from 'commander';
import { LLMTester } from '../../core/debug/llm-tester.js';
import { OllamaProvider } from '../../providers/llm/ollama.js';
import { AnthropicProvider } from '../../providers/llm/anthropic.js';
import { OpenRouterProvider } from '../../providers/llm/openrouter.js';
import { LLMProvider } from '../../providers/llm/index.js';

export const debugCommand = new Command('debug').description('Debug utilities for Alif');

debugCommand
  .command('llm')
  .description('Test and diagnostic for LLM providers')
  .argument('<provider>', 'LLM provider (ollama, anthropic, openrouter)')
  .requiredOption('--model <name>', 'Model name to test')
  .option('--endpoint <url>', 'Base URL/Endpoint (default from config)')
  .option('--key <token>', 'API Key (if required)')
  .option('--sequential', 'Process items one-by-one')
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

    const tester = new LLMTester(provider);
    const { results, debugInfo, totalLatency } = await tester.runTest({
      sequential: options.sequential,
    });

    console.log('\n' + '='.repeat(50));
    console.log('LLM DIAGNOSTIC AUDIT TRAIL');
    console.log('='.repeat(50));

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
  });
