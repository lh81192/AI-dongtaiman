/**
 * Model Provider Definitions
 * 统一管理支持的模型供应商和协议
 */

export type ProviderType = 'text' | 'image' | 'video' | 'audio';
export type Protocol = 'domestic' | 'openai' | 'gemini' | 'seedance' | 'google';

export interface ModelProvider {
  id: string;
  name: string;
  nameZh: string;
  type: ProviderType;
  protocol: Protocol;
  defaultApiUrl?: string;
  modelListEndpoint?: string;
  modelListMethod?: 'GET' | 'POST';
  description?: string;
}

// 文本模型供应商
export const textProviders: ModelProvider[] = [
  // 国产协议
  {
    id: 'zhipu',
    name: 'Zhipu AI',
    nameZh: '智谱 AI',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelListEndpoint: '/models',
    description: '智谱清言大模型',
  },
  {
    id: 'tongyi',
    name: 'Tongyi Qianwen',
    nameZh: '通义千问',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelListEndpoint: '/models',
    description: '阿里云通义千问',
  },
  {
    id: 'ernie',
    name: 'ERNIE Bot',
    nameZh: '文心一言',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1',
    modelListEndpoint: '/model_list',
    description: '百度文心一言',
  },
  {
    id: 'minimax',
    name: 'MiniMax',
    nameZh: 'MiniMax 文本',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    modelListEndpoint: '/models',
    description: 'MiniMax 文本生成',
  },
  {
    id: 'minimax-tts',
    name: 'MiniMax TTS',
    nameZh: 'MiniMax 语音合成',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    modelListEndpoint: '/models',
    description: 'MiniMax 海螺语音合成 (TTS)',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameZh: 'DeepSeek',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.deepseek.com/v1',
    modelListEndpoint: '/models',
    description: 'DeepSeek 大模型',
  },
  {
    id: 'moonshot',
    name: 'Moonshot AI',
    nameZh: '月之暗面',
    type: 'text',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.moonshot.cn/v1',
    modelListEndpoint: '/models',
    description: 'Kimi 大模型',
  },
  // OpenAI 协议
  {
    id: 'openai',
    name: 'OpenAI',
    nameZh: 'OpenAI',
    type: 'text',
    protocol: 'openai',
    defaultApiUrl: 'https://api.openai.com/v1',
    modelListEndpoint: '/models',
    description: 'OpenAI GPT 系列',
  },
  {
    id: 'siliconflow',
    name: 'SiliconFlow',
    nameZh: 'SiliconFlow',
    type: 'text',
    protocol: 'openai',
    defaultApiUrl: 'https://api.siliconflow.cn/v1',
    modelListEndpoint: '/models',
    description: 'SiliconFlow API',
  },
  {
    id: 'togetherai',
    name: 'Together AI',
    nameZh: 'Together AI',
    type: 'text',
    protocol: 'openai',
    defaultApiUrl: 'https://api.together.xyz/v1',
    modelListEndpoint: '/models',
    description: 'Together AI',
  },
  {
    id: 'groq',
    name: 'Groq',
    nameZh: 'Groq',
    type: 'text',
    protocol: 'openai',
    defaultApiUrl: 'https://api.groq.com/openai/v1',
    modelListEndpoint: '/models',
    description: 'Groq LPU',
  },
  {
    id: 'ollama',
    name: 'Ollama',
    nameZh: 'Ollama (本地)',
    type: 'text',
    protocol: 'openai',
    defaultApiUrl: 'http://localhost:11434/v1',
    modelListEndpoint: '/api/tags',
    description: 'Ollama 本地模型',
  },
  // Gemini 协议
  {
    id: 'gemini',
    name: 'Google Gemini',
    nameZh: 'Google Gemini',
    type: 'text',
    protocol: 'gemini',
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelListEndpoint: '/models',
    description: 'Google Gemini 系列',
  },
];

// 图像模型供应商
export const imageProviders: ModelProvider[] = [
  // 国产协议
  {
    id: 'minimax-image',
    name: 'MiniMax Image',
    nameZh: 'MiniMax 图像',
    type: 'image',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    modelListEndpoint: '/models',
    description: 'MiniMax 文生图',
  },
  {
    id: 'zhipu-cogview',
    name: 'Zhipu CogView',
    nameZh: '智谱 CogView',
    type: 'image',
    protocol: 'domestic',
    defaultApiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelListEndpoint: '/models',
    description: '智谱图像生成',
  },
  {
    id: 'tongyi-wanxiang',
    name: 'Tongyi Wanxiang',
    nameZh: '通义万相',
    type: 'image',
    protocol: 'domestic',
    defaultApiUrl: 'https://dashscope.aliyuncs.com/api/v1',
    modelListEndpoint: '/services/aigc/text2image/image-synthesis',
    description: '阿里云通义万相',
  },
  {
    id: 'baidu-image',
    name: 'Baidu Image',
    nameZh: '百度图像生成',
    type: 'image',
    protocol: 'domestic',
    defaultApiUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop',
    description: '百度图像生成',
  },
  // OpenAI 协议
  {
    id: 'dalle',
    name: 'DALL-E',
    nameZh: 'DALL-E',
    type: 'image',
    protocol: 'openai',
    defaultApiUrl: 'https://api.openai.com/v1',
    modelListEndpoint: '/models',
    description: 'OpenAI DALL-E',
  },
  {
    id: 'stability',
    name: 'Stability AI',
    nameZh: 'Stability AI',
    type: 'image',
    protocol: 'openai',
    defaultApiUrl: 'https://api.stability.ai/v1',
    modelListEndpoint: '/engines/list',
    description: 'Stable Diffusion',
  },
  // Gemini 协议
  {
    id: 'imagen',
    name: 'Google Imagen',
    nameZh: 'Google Imagen',
    type: 'image',
    protocol: 'gemini',
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelListEndpoint: '/models',
    description: 'Google Imagen 图像生成',
  },
];

// 音频模型供应商
export const audioProviders: ModelProvider[] = [
  // 国产协议
  {
    id: 'minimax-tts',
    name: 'MiniMax TTS',
    nameZh: 'MiniMax 语音合成',
    type: 'audio',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    modelListEndpoint: '/models',
    description: 'MiniMax 海螺语音合成 (TTS)',
  },
  {
    id: 'minimax-audio',
    name: 'MiniMax Audio',
    nameZh: 'MiniMax 音效',
    type: 'audio',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    description: 'MiniMax 音效生成',
  },
  // OpenAI 协议
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    nameZh: 'ElevenLabs',
    type: 'audio',
    protocol: 'openai',
    defaultApiUrl: 'https://api.elevenlabs.io/v1',
    modelListEndpoint: '/voices',
    description: 'ElevenLabs 语音合成和音效',
  },
  // Gemini 协议
  {
    id: 'google-tts',
    name: 'Google TTS',
    nameZh: 'Google 语音合成',
    type: 'audio',
    protocol: 'gemini',
    defaultApiUrl: 'https://texttospeech.googleapis.com/v1',
    description: 'Google 文字转语音',
  },
];

// 视频模型供应商
export const videoProviders: ModelProvider[] = [
  // Seedance 协议
  {
    id: 'seedance',
    name: 'ByteDance Seedance',
    nameZh: '字节 Seedance',
    type: 'video',
    protocol: 'seedance',
    defaultApiUrl: 'https://team.doubao.com/api/v1',
    modelListEndpoint: '/models',
    description: '字节跳动 Seedance 视频生成',
  },
  // 国产协议
  {
    id: 'cogvideo',
    name: 'Zhipu CogVideoX',
    nameZh: '智谱 CogVideoX',
    type: 'video',
    protocol: 'domestic',
    defaultApiUrl: 'https://open.bigmodel.cn/api/paas/v4',
    modelListEndpoint: '/models',
    description: '智谱 CogVideoX 视频生成',
  },
  {
    id: 'minimax-video',
    name: 'MiniMax Video',
    nameZh: 'MiniMax 视频',
    type: 'video',
    protocol: 'domestic',
    defaultApiUrl: 'https://api.minimax.chat/v1',
    modelListEndpoint: '/models',
    description: 'MiniMax 视频生成',
  },
  // Google 协议
  {
    id: 'veo',
    name: 'Google Veo',
    nameZh: 'Google Veo',
    type: 'video',
    protocol: 'google',
    defaultApiUrl: 'https://generativelanguage.googleapis.com/v1beta',
    modelListEndpoint: '/models',
    description: 'Google Veo 视频生成',
  },
];

// 所有供应商汇总
export const allProviders = [...textProviders, ...imageProviders, ...videoProviders, ...audioProviders];

// 根据类型获取供应商
export function getProvidersByType(type: ProviderType): ModelProvider[] {
  return allProviders.filter(p => p.type === type);
}

// 根据协议获取供应商
export function getProvidersByProtocol(protocol: Protocol): ModelProvider[] {
  return allProviders.filter(p => p.protocol === protocol);
}

// 根据 ID 获取供应商
export function getProviderById(id: string): ModelProvider | undefined {
  return allProviders.find(p => p.id === id);
}

// 协议中文名称映射
export const protocolNames: Record<Protocol, string> = {
  domestic: '国产协议',
  openai: 'OpenAI 协议',
  gemini: 'Gemini 协议',
  seedance: 'Seedance 协议',
  google: 'Google 协议',
};

// 类型中文名称映射
export const typeNames: Record<ProviderType, string> = {
  text: '文本模型',
  image: '图像模型',
  video: '视频模型',
  audio: '音频模型',
};
