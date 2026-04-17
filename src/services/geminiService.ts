import { GoogleGenAI } from "@google/genai";
import { Card } from "../types";

export async function generateTarotSummary(
  question: string,
  drawnCards: { card: Card; isReversed: boolean; position: string }[]
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const cardsInfo = drawnCards.map(d => 
    `位置: ${d.position}, 牌名: ${d.card.name}, 状态: ${d.isReversed ? '逆位' : '正位'}, 关键词: ${(d.isReversed ? d.card.reversed : d.card.upright).join(', ')}`
  ).join('\n');

  const prompt = `你是一位专业的塔罗占卜师。请根据以下信息，给出一个极简、深刻的综合占卜总结。
用户的问题是: "${question || '对当前运势的指引'}"
抽取的牌阵信息如下:
${cardsInfo}

请结合所有牌面的能量，给出一段约100字左右的综合解读。
要求：一针见血、富有启迪。必须严格遵守以下格式，不要使用 ** 加粗符号，也不要有额外的开场白：

【能量】
（这里写入对当前局势的能量分析，约50字）

【建议】
（这里写入具体建议，约50字）`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "命运的迷雾暂时无法拨开，请稍后再试。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "星辰的指引在传输中遇到了干扰，但牌面已揭示了真意。";
  }
}
