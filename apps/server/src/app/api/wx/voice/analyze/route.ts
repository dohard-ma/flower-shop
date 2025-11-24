import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import { createChatCompletion } from '@/lib/api/doubao/chat';

// 文本结构化分析提示词
const TEXT_ANALYSIS_PROMPT = `你是一个专业的花艺作品分析师和电商SEO专家。用户通过语音描述了花艺作品的信息，请从用户的描述中提取结构化信息。

**分析维度：**

1. **花材识别**
- 主花材：识别描述中的主要花材种类，如玫瑰、百合、康乃馨、郁金香、洋桔梗、向日葵等
- 对于玫瑰、百合、康乃馨、掌等花材，需同时识别其颜色（如"粉玫瑰"、"白百合"）
- 配花材：识别辅助花材和叶材，如尤加利、满天星、绿植等

2. **色系识别**（选择1个主要色系）
- 红、粉、白、黄、紫、橙、蓝、绿、混搭

3. **作品类型**（选择最符合的类型）
- 花束、花篮、花盒、桌花、手捧花、抱抱桶、开业花篮、其他

4. **适用人群**（可多选）
- 恋人、朋友、母亲、长辈、病人、商务伙伴、新婚夫妇、其他

5. **枝数估算**（从描述中提取数字）
- 提取描述中的枝数或朵数

6. **价格估算**（从描述中提取数字）
- 提取描述中的价格

**花材识别规则：**
- 将花材归为基本种类：玫瑰、百合、康乃馨、郁金香、洋桔梗、向日葵、绣球等
- 对于玫瑰、百合、康乃馨、掌等花材，必须识别颜色属性
- 品种名称（如"弗洛伊德玫瑰"）统一归类为基本种类+"颜色"

**SEO标题生成规则：**
请生成一个SEO友好的商品标题，包含以下元素：
- 主要花材种类和颜色
- 作品类型
- 适用人群关键词（如送女友、送母亲、商务送礼等）
- 可选的节日/场合关键词（如生日、情人节、母亲节等）
- 保持标题简洁且有吸引力，长度控制在45字以内

**异常处理：**
- 如果用户描述中没有明确的花材、色系、作品类型、适用人群等信息，请返回空。

**输出格式：**
请严格按照以下JSON格式输出：
\`\`\`json
{
  "product_title": "SEO友好的商品标题",
  "store_category": "推荐的店内分类",
  "flowers": ["花材1", "花材2"],
  "color_series": "色系1",
  "suitable_for": ["人群1", "人群2"],
  "quantity": 15,
  "price": 100
}
\`\`\``;

interface TextAnalysisResult {
    product_title: string;
    store_category: string;
    flowers: string[];
    color_series: string;
    suitable_for: string[];
    quantity: number;
    price: number;
}

interface AnalysisResponse {
    analysis: TextAnalysisResult;
}

// POST: AI分析语音转文本后的内容
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { text } = body;

        if (!text) {
            return ApiResponseBuilder.error('trace-id', '缺少文本内容', 400);
        }

        // 调用豆包AI进行文本分析
        const analysisResult = await analyzeText(text);

        const response: AnalysisResponse = {
            analysis: analysisResult
        };

        return ApiResponseBuilder.success('trace-id', response);

    } catch (error: any) {
        console.error('AI文本分析失败:', error);
        return ApiResponseBuilder.error('trace-id', 'AI文本分析失败', 500, [
            {
                message: error.message
            }
        ]);
    }
}

/**
 * 使用豆包AI分析文本
 */
async function analyzeText(text: string): Promise<TextAnalysisResult> {
    try {
        const messages = [
            {
                role: 'user' as const,
                content: `${TEXT_ANALYSIS_PROMPT}\n\n用户语音描述内容：${text}`
            }
        ];

        const response = await createChatCompletion('text', messages);

        if (!response.choices || response.choices.length === 0) {
            throw new Error('AI分析返回结果为空');
        }

        const content = response.choices[0].message.content;

        // 提取JSON内容
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            throw new Error('AI分析结果格式错误');
        }

        const analysisResult = JSON.parse(jsonMatch[1]) as TextAnalysisResult;

        // 验证必要字段
        if (!analysisResult.flowers || !analysisResult.product_title) {
            throw new Error('AI分析结果缺少必要字段');
        }

        return analysisResult;

    } catch (error: any) {
        console.error('AI文本分析失败:', error);

        // 返回默认分析结果
        return {
            product_title: '鲜花花束日常装饰送朋友',
            store_category: '其他',
            flowers: ['未识别'],
            color_series: '混搭',
            suitable_for: ['朋友'],
            quantity: 10,
            price: 100
        };
    }
}
