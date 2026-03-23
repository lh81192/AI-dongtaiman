/**
 * Scene Analyzer
 * 使用 LLM 分析漫画分镜，提取场景描述、角色动作、对白
 */

import { createServiceFromUserConfig, getDefaultConfig } from '@/lib/ai/factory';
import type { SceneAnalysis, Dialogue, CameraType, GenerationConfig } from './types';

interface TextGenerationService {
  generateText(opts: { prompt: string; model?: string; maxTokens?: number; temperature?: number }): Promise<{ text: string }>;
}

export interface AnalyzeSceneInput {
  pageIndex: number;
  imageUrl?: string;
  rawText: string;
  previousSceneDescription?: string;
  config: GenerationConfig;
  userId: string;
}

const SYSTEM_PROMPT = `你是一个专业的漫画分镜分析师。请分析给定的漫画页面，提取以下信息：

1. 场景描述：用一段话描述这个分镜发生的场景
2. 镜头类型：特写、中景、全景、过肩、双人、全景、主观视角
3. 角色动作：列出角色做了什么动作
4. 对白：提取对话内容，包括说话者和情绪
5. 氛围：开心、悲伤、紧张、浪漫、动作、神秘、中性

请用 JSON 格式输出结果。`;

const USER_PROMPT_TEMPLATE = `请分析这个漫画分镜（第 {pageIndex} 页）：

{textContent}

{imageHint}

{previousContext}

请以 JSON 格式输出分析结果，包含以下字段：
- sceneDescription: 场景描述
- setting: 场景地点/环境
- cameraType: 镜头类型
- characterActions: 角色动作列表
- dialogues: 对白列表 [{speaker, text, emotion}]
- mood: 氛围
- videoPrompt: 用于生成视频的提示词（描述场景、角色动作、氛围）
- firstFrameDescription: 第一帧的详细描述
- lastFrameDescription: 最后一帧的描述（描述角色动作和位置的结束状态，用于衔接下一个场景）`;

export async function analyzeScene(input: AnalyzeSceneInput): Promise<SceneAnalysis> {
  const { pageIndex, rawText, previousSceneDescription, config, userId } = input;

  let textService: TextGenerationService | null = null;
  try {
    const textConfigId = config.textModelConfigId || getDefaultConfig(userId, 'text')?.id;
    if (textConfigId) {
      textService = await createServiceFromUserConfig(textConfigId, userId);
    }
  } catch (error) {
    console.warn('[SceneAnalyzer] Failed to create text service, using fallback:', error);
  }

  let textContent = rawText || '（无对白文本）';
  if (textContent.length > 500) {
    textContent = textContent.substring(0, 500) + '...';
  }

  let imageHint = '';
  if (input.imageUrl) {
    imageHint = `\n[图片URL: ${input.imageUrl}]`;
  }

  let previousContext = '';
  if (previousSceneDescription) {
    previousContext = `\n前一个场景描述：${previousSceneDescription}`;
  }

  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{pageIndex}', String(pageIndex))
    .replace('{textContent}', textContent)
    .replace('{imageHint}', imageHint)
    .replace('{previousContext}', previousContext);

  let result: string;
  if (textService) {
    const response = await textService.generateText({
      prompt: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      model: config.textModel,
      maxTokens: 2048,
      temperature: 0.3,
    });
    result = response.text;
  } else {
    result = parseTextOnly(rawText, pageIndex);
  }

  return parseAnalysisResult(result, pageIndex);
}

function parseAnalysisResult(jsonStr: string, pageIndex: number): SceneAnalysis {
  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[0]);
      } catch {
        return createDefaultAnalysis(pageIndex);
      }
    } else {
      return createDefaultAnalysis(pageIndex);
    }
  }

  return {
    sceneId: `scene_${pageIndex}`,
    pageIndex,
    sceneDescription: data.sceneDescription || data.scene_description || '场景描述',
    setting: data.setting || '未知场景',
    timeOfDay: data.timeOfDay || data.time_of_day,
    cameraType: mapCameraType(data.cameraType || data.camera_type || 'medium-shot'),
    cameraMovement: data.cameraMovement || data.camera_movement || 'static',
    characterActions: data.characterActions || data.character_actions || [],
    characterEmotions: data.characterEmotions || data.character_emotions || {},
    dialogues: parseDialogues(data.dialogues || []),
    mood: data.mood || 'neutral',
    visualStyle: data.visualStyle || data.visual_style,
    videoPrompt: data.videoPrompt || data.video_prompt || data.sceneDescription || '',
    negativePrompt: data.negativePrompt || data.negative_prompt,
    firstFrameDescription: data.firstFrameDescription || data.first_frame_description || '',
    lastFrameDescription: data.lastFrameDescription || data.last_frame_description || '',
  };
}

function mapCameraType(type: string): CameraType {
  const typeMap: Record<string, CameraType> = {
    '特写': 'close-up',
    'close-up': 'close-up',
    'closeup': 'close-up',
    '中景': 'medium-shot',
    'medium-shot': 'medium-shot',
    'mediumshot': 'medium-shot',
    '全景': 'wide-shot',
    'wide-shot': 'wide-shot',
    'wideshot': 'wide-shot',
    'over-shoulder': 'over-shoulder',
    'overshoulder': 'over-shoulder',
    '双人镜头': 'two-shot',
    'two-shot': 'two-shot',
    'twoshot': 'two-shot',
    'panoramic': 'panoramic',
    'POV': 'POV',
    'pov': 'POV',
  };
  return typeMap[type.toLowerCase()] || 'medium-shot';
}

function parseDialogues(dialogues: any[]): Dialogue[] {
  if (!Array.isArray(dialogues)) return [];
  return dialogues.map((d: any) => ({
    speaker: d.speaker || d.说话者 || 'Unknown',
    text: d.text || d.对白 || d.content || '',
    emotion: d.emotion || d.情绪 || 'neutral',
    tone: d.tone || d.语气,
  }));
}

function parseTextOnly(rawText: string, pageIndex: number): string {
  const dialogues: Dialogue[] = [];
  const lines = rawText.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    const colonIndex = line.indexOf('：');
    if (colonIndex > 0 && colonIndex < 30) {
      dialogues.push({
        speaker: line.substring(0, colonIndex).trim(),
        text: line.substring(colonIndex + 1).trim(),
        emotion: 'neutral',
      });
    } else {
      dialogues.push({
        speaker: '',
        text: line.trim(),
        emotion: 'neutral',
      });
    }
  }
  return JSON.stringify({
    sceneDescription: `第 ${pageIndex + 1} 页漫画`,
    setting: '漫画场景',
    cameraType: 'medium-shot',
    characterActions: [],
    dialogues,
    mood: 'neutral',
    videoPrompt: `漫画风格动画，${rawText.substring(0, 100)}`,
    firstFrameDescription: '漫画分镜起始画面',
    lastFrameDescription: '漫画分镜结束画面',
  });
}

function createDefaultAnalysis(pageIndex: number): SceneAnalysis {
  return {
    sceneId: `scene_${pageIndex}`,
    pageIndex,
    sceneDescription: `第 ${pageIndex + 1} 页漫画场景`,
    setting: '未知',
    cameraType: 'medium-shot',
    characterActions: [],
    characterEmotions: {},
    dialogues: [],
    mood: 'neutral',
    videoPrompt: '漫画风格动画',
    firstFrameDescription: '起始画面',
    lastFrameDescription: '结束画面',
  };
}

export async function analyzeScenes(
  inputs: AnalyzeSceneInput[],
  onProgress?: (current: number, total: number) => void
): Promise<SceneAnalysis[]> {
  const results: SceneAnalysis[] = [];
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const previousDescription = i > 0 ? results[i - 1].sceneDescription : undefined;
    const analysis = await analyzeScene({
      ...input,
      previousSceneDescription: previousDescription,
    });
    results.push(analysis);
    if (onProgress) {
      onProgress(i + 1, inputs.length);
    }
  }
  return results;
}
