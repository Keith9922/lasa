import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/minimax";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求体必须是 multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("audio");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少 audio 字段" }, { status: 400 });
  }

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "音频文件不能超过 25MB" }, { status: 413 });
  }

  const mimeType = file.type || "audio/webm";
  const arrayBuffer = await file.arrayBuffer();

  const transcript = await transcribeAudio(arrayBuffer, mimeType);

  if (transcript === null) {
    // MiniMax not configured — client should fall back to Web Speech API
    return NextResponse.json({ transcript: null, fallback: true });
  }

  return NextResponse.json({ transcript });
}
