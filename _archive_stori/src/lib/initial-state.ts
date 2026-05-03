import type { AppState, ResumeData } from "@/lib/types";
import { createId, nowIso } from "@/lib/ids";

export const emptyResume: ResumeData = {
  name: "你的姓名",
  headline: "目标岗位 / 个人定位",
  location: "",
  email: "",
  phone: "",
  links: [],
  summary: "当你确认足够素材后，这里会生成一段真实、克制、面向岗位的个人摘要。",
  skills: [],
  experiences: [],
  education: [],
  notes: ["所有内容仅基于已确认故事卡生成，不会自动编造经历或数据。"],
  targetRole: "",
  updatedAt: nowIso(),
};

export function createInitialState(): AppState {
  return {
    schemaVersion: 1,
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        createdAt: nowIso(),
        content:
          "你好！我是 Stori 的 AI 简历教练。\n\n不用急着写简历，先和我聊聊你的经历——项目、实习、课程、社团、兼职都行。我会追问背景、你负责什么、怎么做的、结果如何，然后帮你沉淀成可确认的故事卡。\n\n准备好了就开始吧，讲一个你最想放进简历的经历。",
      },
    ],
    stories: [],
    jobAnalysis: null,
    resume: emptyResume,
  };
}
