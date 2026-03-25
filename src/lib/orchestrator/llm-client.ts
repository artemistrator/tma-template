/**
 * OpenRouter LLM Client for TMA Orchestrator
 *
 * Uses OpenAI-compatible API via OpenRouter.
 * Supports tool calling for full pipeline execution
 * and JSON responses for partial generation (items, marketing).
 */

import { ORCHESTRATOR_TOOLS, getToolsForProvider, type ToolDefinition } from './tool-definitions';
import { buildFullPrompt, type AppType } from './prompts';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'qwen/qwen3-coder';
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_TEMPERATURE = 0.7;
const REQUEST_TIMEOUT_MS = 120_000; // 2 min — LLMs can be slow

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LLMConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Message types for multi-turn tool calling conversations
type Message =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string };

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface LLMChoice {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
  };
  finish_reason: string;
}

interface OpenRouterResponse {
  id: string;
  choices: LLMChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code?: number;
  };
}

export interface LLMResult {
  success: boolean;
  /** Parsed tool calls (for mode=full) */
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> }>;
  /** Raw tool calls with IDs (for multi-turn conversations) */
  rawToolCalls?: ToolCall[];
  /** Text/JSON content (for mode=items/marketing) */
  content?: string;
  /** Parsed JSON from content (convenience) */
  json?: unknown;
  /** Token usage info */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  /** Error message if failed */
  error?: string;
  /** Raw finish reason */
  finishReason?: string;
}

// ─── Core LLM call ─────────────────────────────────────────────────────────

async function callOpenRouter(
  config: LLMConfig,
  messages: Message[],
  options?: {
    tools?: unknown[];
    responseFormat?: { type: 'json_object' } | { type: 'text' };
  },
): Promise<LLMResult> {
  const { apiKey, model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS, temperature = DEFAULT_TEMPERATURE } = config;

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (options?.tools && options.tools.length > 0) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  if (options?.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const maxRetries = 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'TMA Orchestrator',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        // Don't retry on 4xx
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            error: `OpenRouter API error ${response.status}: ${errorText}`,
          };
        }
        // Retry on 5xx
        if (attempt < maxRetries) {
          console.warn(`[LLM] OpenRouter ${response.status}, retrying...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        return {
          success: false,
          error: `OpenRouter API error ${response.status} after ${maxRetries + 1} attempts: ${errorText}`,
        };
      }

      const data: OpenRouterResponse = await response.json();

      if (data.error) {
        return { success: false, error: `OpenRouter error: ${data.error.message}` };
      }

      const choice = data.choices?.[0];
      if (!choice) {
        return { success: false, error: 'No response choices from OpenRouter' };
      }

      const usage = data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
        : undefined;

      // Tool calls response
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCalls = choice.message.tool_calls.map(tc => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments) as Record<string, unknown>,
        }));
        return {
          success: true,
          toolCalls,
          rawToolCalls: choice.message.tool_calls,
          content: choice.message.content || undefined,
          usage,
          finishReason: choice.finish_reason,
        };
      }

      // Text/JSON response
      const content = choice.message.content || '';
      let json: unknown = undefined;
      try {
        // Try to extract JSON from content (might be wrapped in ```json blocks)
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        json = JSON.parse(jsonMatch[1]!.trim());
      } catch {
        // Not JSON — that's fine for text responses
      }

      return {
        success: true,
        content,
        json,
        usage,
        finishReason: choice.finish_reason,
      };
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`[LLM] Network error, retrying...`, error instanceof Error ? error.message : '');
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      return {
        success: false,
        error: `LLM request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  return { success: false, error: 'Unexpected retry exit' };
}

// ─── Helper: get config from env ────────────────────────────────────────────

export function getLLMConfig(): LLMConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  };
}

// ─── High-level orchestrator functions ──────────────────────────────────────

/**
 * Full pipeline generation: user prompt → LLM tool calls → execute pipeline.
 * Returns parsed tool calls ready for pipeline.executeToolCalls().
 */
export async function generateFullPipeline(
  config: LLMConfig,
  prompt: string,
  appType?: AppType,
): Promise<LLMResult> {
  const systemPrompt = appType ? buildFullPrompt(appType) : buildFullPrompt('ecommerce');

  const userMessage = appType
    ? `Тип приложения: ${appType}\n\nБриф от клиента:\n${prompt}`
    : `Бриф от клиента:\n${prompt}\n\nОпредели тип приложения (ecommerce/booking/infobiz) из контекста.`;

  const tools = getToolsForProvider('openai') as unknown[];

  return callOpenRouter(config, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], { tools });
}

/**
 * Generate products/services/info-products from a business description.
 * Returns JSON array of items.
 */
export async function generateItems(
  config: LLMConfig,
  appType: AppType,
  prompt: string,
  count?: number,
): Promise<LLMResult> {
  const itemType = appType === 'ecommerce' ? 'products' : appType === 'booking' ? 'services' : 'info products';
  const itemCount = count || 8;

  const systemPrompt = `You are a business data generator for Telegram Mini Apps.
Generate realistic ${itemType} for a ${appType} business based on the description.

IMPORTANT RULES:
- Output ONLY valid JSON, no other text
- Generate exactly ${itemCount} items
- Prices must be realistic for the described business
- Use the language that matches the business description (Russian for Russian businesses, English for English)
- Categories should be logical groupings

Output format for ecommerce:
[{"name": "...", "price": N, "category": "...", "description": "..."}]

Output format for booking:
[{"name": "...", "price": N, "duration": N, "category": "...", "description": "..."}]

Output format for infobiz:
[{"name": "...", "slug": "...", "type": "article|pdf|course|consultation", "price": N, "description": "..."}]`;

  return callOpenRouter(
    { ...config, temperature: 0.8 },
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Business: ${prompt}\n\nGenerate ${itemCount} ${itemType}.` },
    ],
    { responseFormat: { type: 'json_object' } },
  );
}

/**
 * Generate marketing copy: features, testimonials, FAQ, subtitle.
 * Returns structured JSON.
 */
export async function generateMarketing(
  config: LLMConfig,
  appType: AppType,
  businessName: string,
  items: Array<{ name: string; category?: string }>,
  locale: string,
): Promise<LLMResult> {
  const lang = locale === 'ru' ? 'Russian' : 'English';
  const itemNames = items.map(i => i.name).join(', ');
  const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean))).join(', ');

  const systemPrompt = `You are a marketing copywriter for Telegram Mini Apps.
Generate marketing content for a ${appType} business.

IMPORTANT RULES:
- Output ONLY valid JSON, no other text
- All text must be in ${lang}
- Content must be relevant to the specific business and its products/services
- Testimonials must sound realistic (use common names for ${lang} locale)
- Features should highlight unique selling points

Output this exact JSON structure:
{
  "subtitle": "short catchy tagline (max 60 chars)",
  "features": [
    {"icon": "emoji", "title": "short title", "description": "one sentence"}
  ],
  "testimonials": [
    {"name": "Full Name", "role": "optional role", "rating": 5, "text": "review text"}
  ],
  "faq": [
    {"question": "...", "answer": "..."}
  ]
}

Generate: 1 subtitle, 4 features, 3 testimonials, 4 FAQ items.`;

  return callOpenRouter(
    { ...config, temperature: 0.8 },
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Business: "${businessName}" (${appType})\nProducts/Services: ${itemNames}\nCategories: ${categories || 'none'}\nLocale: ${locale}` },
    ],
    { responseFormat: { type: 'json_object' } },
  );
}

// ─── Multi-turn tool calling loop ────────────────────────────────────────────

export interface ToolExecutor {
  (name: string, args: Record<string, unknown>): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
}

export interface MultiTurnResult {
  success: boolean;
  allToolCalls: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result: { success: boolean; data?: unknown; error?: string };
  }>;
  finalContent?: string;
  totalUsage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  error?: string;
  iterations: number;
}

const MAX_LOOP_ITERATIONS = 15;

/**
 * Full pipeline generation with multi-turn tool calling loop.
 * Sends prompt → LLM returns tool call → execute → send result back → repeat.
 * Stops when LLM returns text without tool calls, or max iterations reached.
 */
export async function generateFullPipelineWithLoop(
  config: LLMConfig,
  prompt: string,
  appType: AppType | undefined,
  toolExecutor: ToolExecutor,
): Promise<MultiTurnResult> {
  const systemPrompt = appType ? buildFullPrompt(appType) : buildFullPrompt('ecommerce');

  const userMessage = appType
    ? `Тип приложения: ${appType}\n\nБриф от клиента:\n${prompt}`
    : `Бриф от клиента:\n${prompt}\n\nОпредели тип приложения (ecommerce/booking/infobiz) из контекста.`;

  const tools = getToolsForProvider('openai') as unknown[];

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const allToolCalls: MultiTurnResult['allToolCalls'] = [];
  const totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  for (let i = 0; i < MAX_LOOP_ITERATIONS; i++) {
    console.log(`[LLM] Multi-turn iteration ${i + 1}/${MAX_LOOP_ITERATIONS}`);

    const result = await callOpenRouter(config, messages, { tools });

    if (!result.success) {
      return {
        success: false,
        allToolCalls,
        error: result.error,
        iterations: i + 1,
        totalUsage,
      };
    }

    // Accumulate usage
    if (result.usage) {
      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens += result.usage.totalTokens;
    }

    // No tool calls → LLM is done
    if (!result.rawToolCalls || result.rawToolCalls.length === 0) {
      return {
        success: allToolCalls.length > 0,
        allToolCalls,
        finalContent: result.content,
        totalUsage,
        iterations: i + 1,
      };
    }

    // Add assistant message with tool calls to conversation history
    messages.push({
      role: 'assistant',
      content: result.content || null,
      tool_calls: result.rawToolCalls,
    });

    // Execute each tool call and add results to conversation
    for (let j = 0; j < result.rawToolCalls.length; j++) {
      const rawTc = result.rawToolCalls[j];
      const parsedTc = result.toolCalls![j];

      console.log(`[LLM]   Tool call: ${parsedTc.name}`, JSON.stringify(parsedTc.arguments).slice(0, 200));
      const execResult = await toolExecutor(parsedTc.name, parsedTc.arguments);

      allToolCalls.push({
        name: parsedTc.name,
        arguments: parsedTc.arguments,
        result: execResult,
      });

      // Send tool result back to LLM
      messages.push({
        role: 'tool',
        tool_call_id: rawTc.id,
        content: JSON.stringify(execResult),
      });

      // If a critical tool failed, stop early
      if (!execResult.success && parsedTc.name === 'create_tenant') {
        return {
          success: false,
          allToolCalls,
          error: `create_tenant failed: ${execResult.error}`,
          totalUsage,
          iterations: i + 1,
        };
      }
    }
  }

  return {
    success: allToolCalls.length > 0,
    allToolCalls,
    error: `Reached max iterations (${MAX_LOOP_ITERATIONS})`,
    totalUsage,
    iterations: MAX_LOOP_ITERATIONS,
  };
}

/**
 * Check if LLM is available (API key configured).
 */
export function isLLMAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
