/**
 * OpenAI-Compatible Protocol Adapter
 *
 * Implementation of generative AI services using OpenAI-compatible API endpoints.
 * This adapter works with any API that follows the OpenAI API specification,
 * including self-hosted models, proxies, and alternative providers.
 */

import type {
  GenerativeTextParams,
  GenerativeImageParams,
  GenerativeTextResult,
  GenerativeImageResult,
  GenerativeService,
  GenerativeModel,
  AIServiceError,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

export interface OpenAICompatibleConfig {
  /** Base URL for the API */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Organization ID (optional) */
  organizationId?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// OpenAI-Compatible Service Implementation
// ============================================================================

export class OpenAICompatibleAdapter implements GenerativeService {
  readonly name = 'openai-compatible';
  readonly provider = 'openai-compatible' as const;

  private config: OpenAICompatibleConfig;
  private cacheModels: GenerativeModel[] | null = null;

  constructor(config: OpenAICompatibleConfig) {
    this.config = {
      timeout: 60000,
      defaultModel: 'gpt-3.5-turbo',
      ...config,
    };
  }

  /**
   * Check if the service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.config.apiUrl) {
      return false;
    }
    try {
      const response = await fetch(`${this.config.apiUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
    const startTime = Date.now();
    try {
      // Try to reach the models endpoint
      const response = await fetch(`${this.config.apiUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(10000),
      });
      const latency = Date.now() - startTime;
      return {
        status: response.ok ? 'healthy' : 'unhealthy',
        latency,
      };
    } catch {
      return { status: 'unhealthy' };
    }
  }

  /**
   * Generate text from prompt
   */
  async generateText(params: GenerativeTextParams): Promise<GenerativeTextResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw this.createError('INVALID_PROMPT', 'Prompt is required');
    }

    const model = params.model || this.config.defaultModel;
    if (!model) {
      throw this.createError('NO_MODEL', 'No model specified');
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: params.prompt }],
          max_tokens: params.maxTokens || 2048,
          temperature: params.temperature ?? 0.7,
          top_p: params.topP,
          n: params.n || 1,
          stop: params.stop,
          ...params.extraParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'TEXT_GENERATION_FAILED',
          error.error?.message || `Text generation failed with status ${response.status}`,
          error
        );
      }

      const data = await response.json();

      // Extract text from OpenAI chat completions format
      const text = data.choices?.[0]?.message?.content || '';

      return {
        id: data.id || `openai_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        text,
        model: data.model || model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
        } : undefined,
        metadata: {
          service: 'openai-compatible',
          provider: this.config.apiUrl,
          latency: Date.now() - startTime,
          finishReason: data.choices?.[0]?.finish_reason,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`);
    }
  }

  /**
   * Generate image from prompt
   */
  async generateImage(params: GenerativeImageParams): Promise<GenerativeImageResult> {
    const startTime = Date.now();

    // Validate required parameters
    if (!params.prompt || params.prompt.trim().length === 0) {
      throw this.createError('INVALID_PROMPT', 'Prompt is required');
    }

    try {
      // Use DALL-E compatible endpoint
      const response = await fetch(`${this.config.apiUrl}/images/generations`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model || 'dall-e-3',
          prompt: params.prompt,
          n: params.n || 1,
          size: `${params.width || 1024}x${params.height || 1024}`,
          response_format: params.format || 'url',
          style: params.style,
          ...params.extraParams,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'IMAGE_GENERATION_FAILED',
          error.error?.message || `Image generation failed with status ${response.status}`,
          error
        );
      }

      const data = await response.json();
      const imageData = data.data?.[0];

      return {
        id: `openai_img_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        url: imageData?.url || imageData?.b64_json || '',
        format: params.format === 'base64' ? 'png' : 'png',
        width: params.width || 1024,
        height: params.height || 1024,
        model: data.model || params.model || 'dall-e-3',
        metadata: {
          service: 'openai-compatible',
          provider: this.config.apiUrl,
          latency: Date.now() - startTime,
          revisedPrompt: imageData?.revised_prompt,
        },
        createdAt: new Date(),
      };
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      throw this.createError('NETWORK_ERROR', `Network error: ${(error as Error).message}`);
    }
  }

  /**
   * Get available models for this provider
   */
  async getModels(): Promise<GenerativeModel[]> {
    if (this.cacheModels) {
      return this.cacheModels;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw this.createError(
          'FETCH_MODELS_FAILED',
          `Failed to fetch models with status ${response.status}`
        );
      }

      const data = await response.json();
      const models = (data.data || []).map((model: {
        id: string;
        object?: string;
        created?: number;
        owned_by?: string;
      }) => ({
        id: model.id,
        name: model.id,
        type: this.inferModelType(model.id),
        provider: 'openai-compatible' as const,
        description: model.owned_by || 'OpenAI-compatible model',
      }));

      this.cacheModels = models;
      return models;
    } catch (error) {
      if (this.isAIServiceError(error)) {
        throw error;
      }
      // Return default models if API fails
      return this.getDefaultModels();
    }
  }

  /**
   * Infer model type from model ID
   */
  private inferModelType(modelId: string): GenerativeModel['type'] {
    const lowerId = modelId.toLowerCase();
    if (lowerId.includes('dall') || lowerId.includes('image') || lowerId.includes('stable-diffusion')) {
      return 'image';
    }
    if (lowerId.includes('video') || lowerId.includes('sora')) {
      return 'video';
    }
    if (lowerId.includes('gpt') || lowerId.includes('text') || lowerId.includes('claude') || lowerId.includes('llama')) {
      return 'text';
    }
    if (lowerId.includes('embedding') || lowerId.includes('embed')) {
      return 'text'; // Embeddings are text-based
    }
    return 'multimodal';
  }

  /**
   * Get default models
   */
  private getDefaultModels(): GenerativeModel[] {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        type: 'text',
        provider: 'openai-compatible',
        description: 'Fast and capable text generation',
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        type: 'text',
        provider: 'openai-compatible',
        description: 'Most capable text generation',
      },
      {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        type: 'image',
        provider: 'openai-compatible',
        description: 'High-quality image generation',
      },
    ];
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    if (this.config.organizationId) {
      headers['OpenAI-Organization'] = this.config.organizationId;
    }
    return headers;
  }

  /**
   * Create an AIServiceError
   */
  private createError(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ): AIServiceError {
    return {
      code,
      message,
      service: 'openai-compatible',
      details,
    };
  }

  /**
   * Check if error is AIServiceError
   */
  private isAIServiceError(error: unknown): error is AIServiceError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'service' in error
    );
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOpenAICompatibleService(config: OpenAICompatibleConfig): OpenAICompatibleAdapter {
  return new OpenAICompatibleAdapter(config);
}
