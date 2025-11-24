import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import { createChatCompletion } from '@/lib/api/doubao/chat';

// 花艺作品分析提示词
const FLOWER_ANALYSIS_PROMPT = `你是一个专业的花艺作品分析师和电商SEO专家。请仔细观察这张花艺作品照片，并按照以下维度进行分类标注：

**分析维度：**

1. **花材识别**
- 主花材：识别作品中的主要花材种类，如玫瑰、百合、康乃馨、郁金香、洋桔梗、向日葵等
- 对于玫瑰、百合、康乃馨、掌等花材，需同时识别其颜色（如"粉玫瑰"、"白百合"）
- 配花材：识别辅助花材和叶材，如尤加利、满天星、绿植等

2. **色系识别**（选择1个主要色系）
- 红、粉、白、黄、紫、橙、蓝、绿、混搭

3. **款式**（选择最符合的款式）
- 花束、花篮、花盒、桌花、手捧花、抱抱桶、开业花篮、其他

**花材识别规则：**
- 将花材归为基本种类：玫瑰、百合、康乃馨、郁金香、洋桔梗、向日葵、绣球等
- 对于玫瑰、百合、康乃馨、掌等花材，必须识别颜色属性
- 品种名称（如"弗洛伊德玫瑰"）统一归类为基本种类+"颜色"

**SEO标题生成规则：**
请生成一个SEO友好的商品标题，包含以下元素：
- 主要花材种类和颜色
- 作品类型
- 保持标题简洁且有吸引力，长度控制在45字以内

**异常处理：**

如果未能识别，请返回空值

**输出格式：**
请严格按照以下JSON格式输出：
\`\`\`json
{
  "product_title": "SEO友好的商品标题",
  "style": "选择最符合的款式",
  "flowers": ["花材1", "花材2"],
  "color_series": "色系1"
}
\`\`\``;

interface FlowerAnalysisResult {
    product_title: string;
    style: string;
    flowers: string[];
    color_series: string;
}

interface AnalysisResponse {
    analysis: FlowerAnalysisResult;
}

// POST: AI分析花艺图片
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { imageUrl } = body;

        if (!imageUrl) {
            return ApiResponseBuilder.error('trace-id', '缺少图片URL参数', 400);
        }

        // 调用豆包AI进行图片分析
        const analysisResult = await analyzeFlowerImage(imageUrl);

        const response: AnalysisResponse = {
            analysis: analysisResult
        };

        return ApiResponseBuilder.success('trace-id', response);

    } catch (error: any) {
        console.error('AI分析失败:', error);
        return ApiResponseBuilder.error('trace-id', 'AI分析失败', 500, [
            {
                message: error.message
            }
        ]);
    }
}

/**
 * 使用豆包AI分析花艺图片
 */
async function analyzeFlowerImage(imageUrl: string): Promise<FlowerAnalysisResult> {
    try {
        const messages = [
            {
                role: 'user' as const,
                content: [
                    {
                        "image_url": {
                            "url": imageUrl
                        },
                        "type": "image_url"
                    },
                    {
                        "text": `${FLOWER_ANALYSIS_PROMPT}\n\n请分析这张花艺作品图片`,
                        "type": "text"
                    }
                ],
            }
        ];

        const response = await createChatCompletion('image', messages);

        if (!response.choices || response.choices.length === 0) {
            throw new Error('AI分析返回结果为空');
        }

        const content = response.choices[0].message.content;

        // 提取JSON内容
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            throw new Error('AI分析结果格式错误');
        }

        const analysisResult = JSON.parse(jsonMatch[1]) as FlowerAnalysisResult;

        // 验证必要字段
        if (!analysisResult.flowers || !analysisResult.product_title) {
            throw new Error('AI分析结果缺少必要字段');
        }

        return analysisResult;

    } catch (error: any) {
        console.error('AI分析失败:', error);

        // 返回默认分析结果
        return {
            product_title: '鲜花花束日常装饰送朋友',
            style: '花束',
            flowers: ['未识别'],
            color_series: '混搭'
        };
    }
}

