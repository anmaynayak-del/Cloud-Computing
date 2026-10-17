import { prisma } from './prisma';

export async function logAiUsage(params: {
  userId?: string | null;
  endpoint: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  model?: string;
  status: 'SUCCESS' | 'ERROR';
  errorMessage?: string;
}) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: params.userId || null,
        endpoint: params.endpoint,
        promptTokens: params.promptTokens || 0,
        completionTokens: params.completionTokens || 0,
        totalTokens: params.totalTokens || ((params.promptTokens || 0) + (params.completionTokens || 0)),
        latencyMs: params.latencyMs || 0,
        model: params.model || 'gemini',
        status: params.status,
        errorMessage: params.errorMessage || null,
      },
    });
  } catch (err) {
    console.warn('Failed to record AI usage log:', err);
  }
}
