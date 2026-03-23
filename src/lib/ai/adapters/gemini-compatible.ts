/**
 * Gemini-Compatible Protocol Adapter
 *
 * Implementation of generative AI services using Google Gemini-compatible API endpoints.
 * This adapter works with Gemini Pro, Gemini Ultra, and any Gemini-compatible endpoints.
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

export interface GeminiCompatibleConfig {
  /** Base URL for the API */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Default model to use */
  defaultModel?: string;
  /** API version to use */
  apiVersion?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

// ============================================================================
// Gemini-Compatible Service Implementation
// ============================================================================

export class GeminiCompatibleAdapter implements GenerativeService {
  readonly name = 'gemini-compatible';
  readonly provider = 'gemini-compatible' as const;

  private config: GeminiCompatibleConfig;
  private cacheModels: GenerativeModel[] | null = null;

  constructor(config: GeminiCompatibleConfig) {
    this.config = {
      timeout: 60000,
      apiVersion: 'v1beta',
      defaultModel: 'gemini-pro',
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
      // Try to reach the models endpoint
      const response = await fetch(`${this.config.apiUrl}/models?key=${this.config.apiKey || ''}`, {
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
      const response = await fetch(`${this.config.apiUrl}/models?key=${this.config.apiKey || ''}`, {
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
      const response = await fetch(`${this.config.apiUrl}/${model}:generateContent?key=${this.config.apiKey || ''}`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: params.prompt }]
          }],
          generationConfig: {
            maxOutputTokens: params.maxTokens || 2048,
            temperature: params.temperature ?? 0.9,
            topP: params.topP,
            candidateCount: params.n || 1,
            stopSequences: params.stop,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw this.createError(
          'TEXT_GENERATION_FAILED',
          error.error?.message || error.error?.status || `Text generation failed with status ${response.status}`,
          error
        );
      }

      const data = await response.json();

      // Extract text from Gemini response format
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        id: data.name || `gemini_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        text,
        model: model,
        usage: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount || 0,
          completionTokens: data.usageMetadata.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata.totalTokenCount || 0,
        } : undefined,
        metadata: {
          service: 'gemini-compatible',
          provider: this.config.apiUrl,
          latency: Date.now() - startTime,
          finishReason: data.candidates?.[0]?.finishReason,
          safetyRatings: data.candidates?.[0]?.safetyRatings,
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
      // Use Imagen-compatible endpoint
      const response = await fetch(`${this.config.apiUrl}/images:generate?key=${this.config.apiKey || ''}`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: params.model || 'imagegeneration@006',
          prompt: params.prompt,
          numberOfImages: params.n || 1,
          aspectRatio: this.aspectRatioToGemini(params.width, params.height),
          personGeneration: 'dont_allow',
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
      const imageData = data.images?.[0];

      return {
        id: `gemini_img_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        url: imageData?.base64 || imageData?.url || '',
        format: 'png',
        width: params.width || 1024,
        height: params.height || 1024,
        model: data.model || params.model || 'imagegeneration@006',
        metadata: {
          service: 'gemini-compatible',
          provider: this.config.apiUrl,
          latency: Date.now() - startTime,
          revisedPrompt: imageData?.revisedPrompt,
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
   * Convert width/height to Gemini aspect ratio format
   */
  private aspectRatioToGemini(width?: number, height?: number): string {
    if (!width || !height) return '1:1';

    const ratio = width / height;
    if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
    if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4';
    return '1:1';
  }

  /**
   * Get available models for this provider
   */
  async getModels(): Promise<GenerativeModel[]> {
    if (this.cacheModels) {
      return this.cacheModels;
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/models?key=${this.config.apiKey || ''}`, {
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
      const models = (data.models || []).map((model: {
        name: string;
        displayName?: string;
        description?: string;
        supportedGenerationMethods?: string[];
        inputTokenLimit?: number;
        outputTokenLimit?: number;
      }) => ({
        id: model.name.replace('models/', ''),
        name: model.displayName || model.name,
        type: this.inferModelType(model.supportedGenerationMethods || []),
        provider: 'gemini-compatible' as const,
        description: model.description,
        capabilities: model.supportedGenerationMethods,
        maxTokens: model.outputTokenLimit,
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
   * Infer model type from generation methods
   */
  private inferModelType(methods: string[]): GenerativeModel['type'] {
    if (methods.includes('generateImage')) {
      return 'image';
    }
    if (methods.includes('generateVideo')) {
      return 'video';
    }
    if (methods.includes('generateContent')) {
      return 'text';
    }
    return 'multimodal';
  }

  /**
   * Get default models
   */
  private getDefaultModels(): GenerativeModel[] {
    return [
      {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        type: 'text',
        provider: 'gemini-compatible',
        description: 'Capable text and code generation',
      },
      {
        id: 'gemini-pro-vision',
        name: 'Gemini Pro Vision',
        type: 'multimodal',
        provider: 'gemini-compatible',
        description: 'Text and image understanding',
      },
      {
        id: 'gemini-ultra',
        name: 'Gemini Ultra',
        type: 'text',
        provider: 'gemini-compatible',
        description: 'Most capable text generation',
      },
      {
        id: 'imagegeneration@006',
        name: 'Imagen',
        type: 'image',
        provider: 'gemini-compatible',
        description: 'High-quality image generation',
      },
    ];
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
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
      service: 'gemini-compatible',
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

export function createGeminiCompatibleService(config: GeminiCompatibleConfig): GeminiCompatibleAdapter {
  return new GeminiCompatibleAdapter(config);
}
