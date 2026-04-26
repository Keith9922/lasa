import { NextResponse } from "next/server";
import type { CoachRequest, CoachResponse } from "@/lib/types";
import { coachRequestSchema } from "@/lib/coach-schemas";
import { analyzeJobDescription, extractStoriesFromAnswer, generateResume, getNextQuestion, updateCoverage } from "@/lib/resume-engine";
import { runMiniMaxCoach } from "@/lib/minimax";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求格式不正确", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const coachRequest = parsed.data as CoachRequest;
  const fallback = runLocalCoach(coachRequest);

  try {
    const response = await runMiniMaxCoach(coachRequest, fallback);
    return NextResponse.json(response);
  } catch (err) {
    console.error("Coach route error:", err);
    return NextResponse.json(fallback);
  }
}

function runLocalCoach(request: CoachRequest): CoachResponse {
  switch (request.action) {
    case "analyze-jd": {
      const analysis = analyzeJobDescription(request.jdText, request.stories);
      return {
        action: "analyze-jd",
        analysis,
        message: `✅ 已解析 JD，识别出 ${analysis.requirements.length} 个能力项。接下来会优先追问缺失或弱覆盖的证据。`,
        usedAI: false,
      };
    }
    case "extract-story": {
      const stories = extractStoriesFromAnswer(request.answer, request.stories, request.jobAnalysis);
      const updatedAnalysis = request.jobAnalysis ? updateCoverage(request.jobAnalysis, [...request.stories, ...stories]) : null;
      return {
        action: "extract-story",
        stories,
        message: stories.length > 0 ? "已从你的回答中提炼出故事卡，请先确认事实是否准确。" : "这段回答还不够具体，建议补充背景、动作和结果。",
        nextQuestion: getNextQuestion([...request.stories, ...stories], updatedAnalysis),
        usedAI: false,
      };
    }
    case "next-question":
      return { action: "next-question", question: getNextQuestion(request.stories, request.jobAnalysis), usedAI: false };
    case "generate-resume": {
      const resume = generateResume(request.stories, request.jobAnalysis, request.baseResume);
      return {
        action: "generate-resume",
        resume,
        message: "✅ 已基于当前故事卡生成简历草稿。未确认或证据不足的信息不会被写成强事实。",
        usedAI: false,
      };
    }
  }
}
