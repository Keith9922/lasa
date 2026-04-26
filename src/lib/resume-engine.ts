import type {
  AppState,
  EvidenceItem,
  JobAnalysis,
  JobRequirement,
  ResumeData,
  ResumeExperience,
  StoryCard,
} from "@/lib/types";
import { createId, nowIso } from "@/lib/ids";
import { emptyResume } from "@/lib/initial-state";

const hardSkillPatterns = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Python", "Java",
  "SQL", "PostgreSQL", "MySQL", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
  "数据分析", "用户增长", "A/B", "CRM", "SaaS", "产品设计", "需求分析", "项目管理", "运营", "商业化",
];

const softSkillPatterns = ["沟通", "协作", "推进", "跨团队", "领导", "复盘", "分析", "用户访谈", "汇报", "协调"];

const metricRegex = /(\d+(?:\.\d+)?\s?(?:%|人|天|周|月|年|次|个|万|千|小时|h|k|K|w|W|元|￥|¥|美元|\+))/g;

export function createDemoState(): AppState {
  const jobAnalysis = analyzeJobDescription(
    "某 B2B SaaS 产品经理岗位，要求负责用户增长和留存，能独立完成需求分析、用户访谈、数据分析、跨团队项目推进，熟悉 A/B 实验和后台产品设计，有 0-2 年实习或项目经验。",
    [],
  );
  const stories = extractStoriesFromAnswer(
    "我在校园二手交易小程序项目里负责产品和增长。我们发现新用户发布商品的转化很低，我访谈了 12 个同学，整理出流程太长和分类不清的问题，然后把发布流程从 5 步改成 3 步，补了默认分类和价格建议。上线两周后，发布转化率从 18% 提升到 31%，日均商品数从 80 增加到 140。过程中我协调了 2 名前端、1 名后端和 1 名设计同学。",
    [],
    jobAnalysis,
  );

  return {
    schemaVersion: 1,
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        content: "已载入一个示例场景 🎉\n\n你可以继续编辑 JD、补充经历，或者直接点击「生成简历」查看效果。",
        createdAt: nowIso(),
      },
    ],
    stories,
    jobAnalysis: updateCoverage(jobAnalysis, stories),
    resume: generateResume(stories, jobAnalysis, emptyResume),
  };
}

export function analyzeJobDescription(jdText: string, stories: StoryCard[]): JobAnalysis {
  const title = detectTitle(jdText);
  const company = detectCompany(jdText);
  const keywords = uniqueStrings([...collectKnownTerms(jdText, hardSkillPatterns), ...collectKnownTerms(jdText, softSkillPatterns)]);
  const requirements = buildRequirements(jdText, keywords, stories);

  const analysis: JobAnalysis = {
    id: createId("jd"),
    title,
    company,
    rawText: jdText,
    summary: buildJobSummary(title, company, requirements),
    keywords,
    requirements,
    followUpQuestions: buildFollowUpQuestions(requirements),
    updatedAt: nowIso(),
  };

  return updateCoverage(analysis, stories);
}

export function updateCoverage(analysis: JobAnalysis, stories: StoryCard[]): JobAnalysis {
  const requirements = analysis.requirements.map((requirement) => {
    const evidenceStoryIds = stories
      .filter((story) => story.status === "confirmed" || story.status === "draft")
      .filter((story) => storyMatchesRequirement(story, requirement.label))
      .map((story) => story.id);
    return { ...requirement, coverage: getCoverageStatus(evidenceStoryIds.length, stories.length), evidenceStoryIds };
  });
  return { ...analysis, requirements, followUpQuestions: buildFollowUpQuestions(requirements), updatedAt: nowIso() };
}

export function extractStoriesFromAnswer(answer: string, stories: StoryCard[], jobAnalysis: JobAnalysis | null): StoryCard[] {
  const cleanedAnswer = answer.trim();
  if (!cleanedAnswer) return [];

  const skills = inferSkills(cleanedAnswer, jobAnalysis);
  const metrics = collectMetrics(cleanedAnswer);
  const actions = inferActions(cleanedAnswer);
  const result = inferResult(cleanedAnswer, metrics);
  const context = inferContext(cleanedAnswer);
  const title = inferStoryTitle(cleanedAnswer, skills, stories.length);
  const role = inferRole(cleanedAnswer);
  const followUps = buildStoryFollowUps({ answer: cleanedAnswer, actions, metrics, result, skills, jobAnalysis });

  return [
    {
      id: createId("story"),
      title,
      context,
      role,
      actions,
      result,
      evidence: metrics.map((metric) => createEvidence(metric)),
      skills,
      followUps,
      status: followUps.length > 0 ? "needs-info" : "draft",
      sourceQuote: cleanedAnswer,
      createdAt: nowIso(),
    },
  ];
}

export function getNextQuestion(stories: StoryCard[], jobAnalysis: JobAnalysis | null): string {
  const unresolvedStory = stories.find((story) => story.status !== "confirmed" && story.followUps.length > 0);
  if (unresolvedStory) return unresolvedStory.followUps[0];

  const missingRequirement = jobAnalysis?.requirements.find((r) => r.coverage === "missing");
  if (missingRequirement) {
    return `JD 里强调"${missingRequirement.label}"。你有没有一个能证明这项能力的具体经历？请讲当时的背景、你负责什么、做了什么、结果如何。`;
  }

  if (stories.length === 0) {
    return "先讲一个你最想放进简历的经历。可以从项目、实习、课程设计、社团、兼职或个人作品开始。";
  }

  return "再补充一个不同类型的经历吧。优先讲有结果、有协作、有难点或能体现岗位关键词的事情。";
}

export function generateResume(stories: StoryCard[], jobAnalysis: JobAnalysis | null, baseResume: ResumeData): ResumeData {
  const confirmedStories = stories.filter((s) => s.status === "confirmed");
  const usableStories = confirmedStories.length > 0 ? confirmedStories : stories;
  const skills = uniqueStrings(usableStories.flatMap((s) => s.skills)).slice(0, 12);
  const targetRole = jobAnalysis?.title || baseResume.targetRole || "目标岗位";

  return {
    ...baseResume,
    headline: targetRole === "目标岗位" ? baseResume.headline : `${targetRole}候选人`,
    summary: buildResumeSummary(usableStories, jobAnalysis),
    skills,
    experiences: usableStories.map((s) => storyToExperience(s)),
    notes: buildResumeNotes(usableStories, jobAnalysis),
    targetRole,
    updatedAt: nowIso(),
  };
}

export function calculateReadiness(stories: StoryCard[], jobAnalysis: JobAnalysis | null): number {
  const confirmedScore = Math.min(45, stories.filter((s) => s.status === "confirmed").length * 15);
  const evidenceScore = Math.min(25, stories.flatMap((s) => s.evidence).filter((e) => e.strength !== "weak").length * 6);
  const coverageScore = jobAnalysis
    ? Math.round((jobAnalysis.requirements.filter((r) => r.coverage !== "missing").length / Math.max(1, jobAnalysis.requirements.length)) * 30)
    : 10;
  return Math.min(100, confirmedScore + evidenceScore + coverageScore);
}

export function getCoverageCounts(jobAnalysis: JobAnalysis | null): { covered: number; weak: number; missing: number } {
  if (!jobAnalysis) return { covered: 0, weak: 0, missing: 0 };
  return jobAnalysis.requirements.reduce(
    (acc, r) => ({ ...acc, [r.coverage]: acc[r.coverage] + 1 }),
    { covered: 0, weak: 0, missing: 0 },
  );
}

// ── private helpers ────────────────────────────────────────────────────────

function detectTitle(text: string): string {
  const titleMatch = text.match(/(?:岗位|职位|招聘|应聘|Title|Position)[:：\s]*([^\n，,。；;]{2,30})/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  const knownTitles = ["产品经理", "前端工程师", "后端工程师", "全栈工程师", "运营", "数据分析师", "项目经理", "设计师"];
  return knownTitles.find((t) => text.includes(t)) ?? "目标岗位";
}

function detectCompany(text: string): string {
  const m = text.match(/(?:公司|企业|Company)[:：\s]*([^\n，,。；;]{2,30})/i);
  return m?.[1]?.trim() ?? "";
}

function collectKnownTerms(text: string, terms: string[]): string[] {
  const lower = text.toLowerCase();
  return terms.filter((t) => lower.includes(t.toLowerCase()));
}

function collectMetrics(text: string): string[] {
  return Array.from(text.matchAll(metricRegex), (m) => m[1]).slice(0, 8);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function buildRequirements(text: string, keywords: string[], stories: StoryCard[]): JobRequirement[] {
  const keywordReqs = keywords.map((kw) => createRequirement(kw, categorizeRequirement(kw), "must", stories));
  const respReqs = splitResponsibilities(text)
    .slice(0, 6)
    .map((item) => createRequirement(item, "responsibility", "should", stories));
  return uniqueRequirements([...keywordReqs, ...respReqs]).slice(0, 12);
}

function createRequirement(label: string, category: JobRequirement["category"], priority: JobRequirement["priority"], stories: StoryCard[]): JobRequirement {
  const evidenceStoryIds = stories.filter((s) => storyMatchesRequirement(s, label)).map((s) => s.id);
  return { id: createId("req"), label, category, priority, coverage: getCoverageStatus(evidenceStoryIds.length, stories.length), evidenceStoryIds };
}

function uniqueRequirements(reqs: JobRequirement[]): JobRequirement[] {
  const seen = new Set<string>();
  return reqs.filter((r) => { const k = r.label.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

function categorizeRequirement(label: string): JobRequirement["category"] {
  if (hardSkillPatterns.some((t) => t.toLowerCase() === label.toLowerCase())) return "hard-skill";
  if (softSkillPatterns.some((t) => t.toLowerCase() === label.toLowerCase())) return "soft-skill";
  return "responsibility";
}

function splitResponsibilities(text: string): string[] {
  return text
    .split(/[。\n；;]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && s.length <= 42)
    .filter((s) => /负责|推动|完成|分析|设计|协作|优化|提升|搭建|运营|管理/.test(s));
}

function storyMatchesRequirement(story: StoryCard, label: string): boolean {
  const haystack = `${story.title} ${story.context} ${story.role} ${story.actions.join(" ")} ${story.result} ${story.skills.join(" ")}`.toLowerCase();
  return haystack.includes(label.toLowerCase());
}

function getCoverageStatus(matchCount: number, storyCount: number): JobRequirement["coverage"] {
  if (matchCount >= 2) return "covered";
  if (matchCount === 1) return "weak";
  if (storyCount === 0) return "missing";
  return "missing";
}

function buildFollowUpQuestions(reqs: JobRequirement[]): string[] {
  return reqs.filter((r) => r.coverage === "missing").slice(0, 4)
    .map((r) => `补充一个能证明"${r.label}"的具体经历，最好包含动作、协作对象和结果。`);
}

function buildJobSummary(title: string, company: string, reqs: JobRequirement[]): string {
  const top = reqs.slice(0, 5).map((r) => r.label).join("、");
  const companyPart = company ? `${company}的` : "";
  return `${companyPart}${title}重点关注${top || "岗位职责、能力证据和项目结果"}。`;
}

function inferSkills(answer: string, jobAnalysis: JobAnalysis | null): string[] {
  const jobTerms = jobAnalysis?.keywords ?? [];
  const inferred = uniqueStrings([
    ...collectKnownTerms(answer, hardSkillPatterns),
    ...collectKnownTerms(answer, softSkillPatterns),
    ...jobTerms.filter((t) => answer.toLowerCase().includes(t.toLowerCase())),
  ]);
  if (inferred.length > 0) return inferred.slice(0, 8);
  if (/项目|上线|产品|用户|需求/.test(answer)) return ["需求分析", "项目推进"];
  if (/数据|指标|转化|留存|增长/.test(answer)) return ["数据分析", "用户增长"];
  return ["问题拆解", "执行落地"];
}

function inferActions(answer: string): string[] {
  const sentences = answer.split(/[。；;\n]/).map((s) => s.trim()).filter(Boolean);
  const actionSentences = sentences.filter((s) => /我|负责|设计|搭建|推动|协调|分析|优化|访谈|上线|实现|整理/.test(s));
  if (actionSentences.length > 0) return actionSentences.slice(0, 4);
  return [answer.length > 90 ? `${answer.slice(0, 88)}...` : answer];
}

function inferResult(answer: string, metrics: string[]): string {
  const resultSentence = answer.split(/[。；;\n]/).map((s) => s.trim())
    .find((s) => /提升|增长|降低|减少|完成|上线|获得|转化|留存|收入|效率/.test(s));
  if (resultSentence) return resultSentence;
  if (metrics.length > 0) return `已提到可量化结果：${metrics.join("、")}，建议继续补充这些数字对应的业务含义。`;
  return "结果还不够明确，需要补充可验证的影响、反馈或产出。";
}

function inferContext(answer: string): string {
  const sentence = answer.split(/[。；;\n]/).map((s) => s.trim())
    .find((s) => /项目|实习|课程|社团|公司|小程序|平台|系统|活动/.test(s));
  return sentence ?? "用户提供了一段待结构化的经历，需要继续补充场景背景。";
}

function inferStoryTitle(answer: string, skills: string[], index: number): string {
  const projectMatch = answer.match(/([一-龥A-Za-z0-9]{2,24}(?:项目|系统|平台|小程序|活动|实习))/);
  if (projectMatch?.[1]) return projectMatch[1];
  if (skills.length > 0) return `${skills[0]}经历 ${index + 1}`;
  return `经历故事 ${index + 1}`;
}

function inferRole(answer: string): string {
  const roleMatch = answer.match(/(?:负责|担任|作为|角色是)([^。；;\n]{2,36})/);
  return roleMatch?.[1]?.trim() ?? "需要用户继续确认自己的职责边界";
}

function createEvidence(metric: string): EvidenceItem {
  return {
    id: createId("evi"),
    label: "量化证据",
    value: metric,
    strength: /%|万|千|元|￥|¥|\+/.test(metric) ? "strong" : "medium",
  };
}

function buildStoryFollowUps(input: { answer: string; actions: string[]; metrics: string[]; result: string; skills: string[]; jobAnalysis: JobAnalysis | null }): string[] {
  const questions: string[] = [];
  if (input.actions.length < 2) questions.push("你具体做了哪 2-3 个动作？可以按时间顺序讲。");
  if (input.metrics.length === 0) questions.push("这件事有没有数字、用户反馈、排名、交付物或上线结果可以证明？");
  if (input.result.includes("不够明确")) questions.push("最后结果是什么？如果没有数据，也可以说产出了什么、谁认可了、解决了什么问题。");
  const missingKeyword = input.jobAnalysis?.requirements.find((r) => r.coverage === "missing" && !input.skills.includes(r.label));
  if (missingKeyword) questions.push(`这段经历能否体现"${missingKeyword.label}"？如果可以，请补充对应细节。`);
  return questions.slice(0, 3);
}

function buildResumeSummary(stories: StoryCard[], jobAnalysis: JobAnalysis | null): string {
  if (stories.length === 0) return "请先确认至少一张经历故事卡，再生成更完整的简历摘要。";
  const topSkills = uniqueStrings(stories.flatMap((s) => s.skills)).slice(0, 4).join("、");
  const evidenceCount = stories.flatMap((s) => s.evidence).length;
  const target = jobAnalysis?.title ?? "目标岗位";
  return `面向${target}的候选人，已沉淀 ${stories.length} 段可验证经历，覆盖${topSkills || "项目推进、问题拆解"}等能力。简历表达将优先使用用户确认过的职责、行动和 ${evidenceCount} 项证据，保持真实克制并突出岗位相关性。`;
}

function storyToExperience(story: StoryCard): ResumeExperience {
  const actionBullets = story.actions.map(normalizeBullet);
  const evidenceBullets = story.evidence.map((e) => `以 ${e.value} 作为 ${e.label}，支撑该经历的业务或交付影响`);
  const resultBullet = normalizeBullet(story.result);
  const bullets = uniqueStrings([...actionBullets, resultBullet, ...evidenceBullets]).slice(0, 5);
  return {
    id: story.id,
    title: story.title,
    organization: story.context.length > 30 ? story.context.slice(0, 30) : story.context,
    period: "待补充时间",
    bullets,
    skills: story.skills,
  };
}

function normalizeBullet(value: string): string {
  const trimmed = value.replace(/^我\s*/, "").trim();
  return trimmed.endsWith("。") ? trimmed.slice(0, -1) : trimmed;
}

function buildResumeNotes(stories: StoryCard[], jobAnalysis: JobAnalysis | null): string[] {
  const notes = ["未确认故事卡不会作为强事实处理；缺少时间、公司、学历等信息时会保留待补充提示。"];
  if (jobAnalysis) {
    const missing = jobAnalysis.requirements.filter((r) => r.coverage === "missing").slice(0, 3);
    if (missing.length > 0) notes.push(`仍建议补充这些岗位证据：${missing.map((r) => r.label).join("、")}。`);
  }
  if (stories.length === 0) notes.push("当前还没有可用经历，请先通过对话采集素材。");
  return notes;
}
