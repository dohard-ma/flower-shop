import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

// 花艺作品分析提示词
const FLOWER_ANALYSIS_PROMPT = `你是一个专业的花艺作品分析师和电商SEO专家。请仔细观察这张花艺作品照片，并按照以下维度进行分类标注：

**分析维度：**

1. **花材识别**
- 主花材：识别作品中的主要花材种类，如玫瑰、百合、康乃馨、郁金香、洋桔梗、向日葵等
- 对于玫瑰、百合、康乃馨、掌等花材，需同时识别其颜色（如"粉玫瑰"、"白百合"）
- 如果花材数量较多，最多识别3种主花材

2. **色系识别**（选择1个主要色系）
- 红、粉、白、黄、紫、橙、蓝、绿、混搭

3. **赠送对象**（最多三个）
- 男友/老公、女友/老婆、新生儿、学生、父母、闺蜜、长辈、朋友/同事、老师、客户、病人、儿童

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
  "flowers": ["花材1", "花材2"],
  "color_series": "色系1",
  "suitable_for": ["赠送对象1", "赠送对象2", "赠送对象3"]
}
\`\`\``;

interface FlowerAnalysisResult {
    flowers: string[];
    color_series: string;
    suitable_for: string[];
}

// AI 分析函数
async function analyzeFlowerImage(imageUrl: string, productTitle?: string, colorSeries?: string): Promise<FlowerAnalysisResult> {
    // 创建 axios 实例
    const api = axios.create({
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.DOUBAO_API_KEY}`,
        },
    });

    // 构建提示文本
    const additionalInfo: string[] = [];
    if (productTitle && productTitle.trim()) {
        additionalInfo.push(`原有标题为：${productTitle}`);
    }
    if (colorSeries && colorSeries.trim()) {
        additionalInfo.push(`色系为：${colorSeries}`);
    }

    const promptText = additionalInfo.length > 0
        ? `${FLOWER_ANALYSIS_PROMPT}\n\n请分析这张花艺作品图片，${additionalInfo.join('，')}`
        : `${FLOWER_ANALYSIS_PROMPT}\n\n请分析这张花艺作品图片`;

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
                    "text": promptText,
                    "type": "text"
                }
            ],
        }
    ];

    const requestData = {
        model: 'doubao-seed-1-6-vision-250815',
        messages,
        stream: false,
    };

    try {
        const response = await api.post('/chat/completions', requestData);

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error('AI分析返回结果为空');
        }

        const content = response.data.choices[0].message.content;

        // 提取JSON内容
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (!jsonMatch) {
            throw new Error('AI分析结果格式错误：未找到JSON内容');
        }

        const analysisResult = JSON.parse(jsonMatch[1]) as FlowerAnalysisResult;

        // 验证必要字段
        if (!analysisResult.flowers || !Array.isArray(analysisResult.flowers) || analysisResult.flowers.length === 0) {
            throw new Error('AI分析结果缺少必要字段：flowers');
        }
        if (!analysisResult.color_series) {
            throw new Error('AI分析结果缺少必要字段：color_series');
        }
        if (!analysisResult.suitable_for || !Array.isArray(analysisResult.suitable_for)) {
            throw new Error('AI分析结果缺少必要字段：suitable_for');
        }

        return analysisResult;

    } catch (error: any) {
        // 简化错误信息
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const statusText = error.response?.statusText;
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.message || error.message;
            throw new Error(`AI API请求失败: ${status} ${statusText} - ${errorMessage}`);
        }
        throw new Error(`AI分析失败: ${error.message || '未知错误'}`);
    }
}

// 处理单个商品
async function processProduct(product: any, index: number, total: number): Promise<{ success: boolean; skipped: boolean }> {
    console.log(`\n处理商品 ${index + 1}/${total}: ${product.name} (${product.id})`);

    // 获取第一张图片
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
        console.log(`  ⚠ 跳过：商品没有图片`);
        return { success: false, skipped: true };
    }

    const firstImageUrl = product.images[0] as string;
    if (!firstImageUrl || typeof firstImageUrl !== 'string') {
        console.log(`  ⚠ 跳过：图片URL无效`);
        return { success: false, skipped: true };
    }

    try {
        console.log(`  分析图片: ${firstImageUrl}`);

        // 调用 AI 分析（如果失败会抛出错误，不会更新数据库）
        const analysisResult = await analyzeFlowerImage(
            firstImageUrl,
            product.name || undefined,
            product.colorSeries || undefined
        );

        console.log(`  AI分析结果:`, {
            flowers: analysisResult.flowers,
            color_series: analysisResult.color_series,
            suitable_for: analysisResult.suitable_for
        });

        // 只有在 AI 分析成功后才更新数据库
        const updateData: any = {
            materials: analysisResult.flowers
        };

        // 如果 colorSeries 为空，则更新 colorSeries
        if (!product.colorSeries && analysisResult.color_series) {
            updateData.colorSeries = analysisResult.color_series;
        }

        // 如果 targetAudience 为空，则更新 targetAudience
        if (!product.targetAudience && analysisResult.suitable_for) {
            updateData.targetAudience = analysisResult.suitable_for;
        }

        await prisma.product.update({
            where: { id: product.id },
            data: updateData
        });

        console.log(`  ✓ 更新成功`);
        return { success: true, skipped: false };

    } catch (error: any) {
        // 简化错误日志，只打印关键信息
        const errorMessage = error.message || '未知错误';
        console.error(`  ✗ AI分析失败: ${errorMessage}`);
        // 出错时不更新数据库，直接返回失败
        return { success: false, skipped: false };
    }
}

// 并发控制函数：限制同时进行的请求数量
async function processWithConcurrencyLimit<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    concurrencyLimit: number
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let index = 0;

    // 启动初始批次的任务
    const workers: Promise<void>[] = [];

    for (let i = 0; i < Math.min(concurrencyLimit, items.length); i++) {
        workers.push(worker());
    }

    // 工作函数：处理队列中的任务
    async function worker(): Promise<void> {
        while (index < items.length) {
            const currentIndex = index++;
            const item = items[currentIndex];

            try {
                const result = await processor(item, currentIndex);
                results[currentIndex] = result;
            } catch (error) {
                // 错误已在 processor 中处理，这里只记录
                results[currentIndex] = { success: false, skipped: false } as R;
            }
        }
    }

    // 等待所有工作线程完成
    await Promise.all(workers);

    return results;
}

// 主函数
async function updateProductsMaterials() {
    try {
        console.log('开始更新商品花材数据...');

        // 查询所有商品
        const products = await prisma.product.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });

        console.log(`找到 ${products.length} 个商品`);

        // 并发处理，最多同时处理10个
        const CONCURRENCY_LIMIT = 10;
        console.log(`使用并发处理，最多同时处理 ${CONCURRENCY_LIMIT} 个商品\n`);

        const results = await processWithConcurrencyLimit(
            products,
            (product, index) => processProduct(product, index, products.length),
            CONCURRENCY_LIMIT
        );

        // 统计结果
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const result of results) {
            if (result.success) {
                successCount++;
            } else if (result.skipped) {
                skipCount++;
            } else {
                errorCount++;
            }
        }

        console.log(`\n更新完成！`);
        console.log(`成功: ${successCount} 个`);
        console.log(`跳过: ${skipCount} 个`);
        console.log(`失败: ${errorCount} 个`);

    } catch (error) {
        console.error('更新失败:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// 运行脚本
updateProductsMaterials()
    .then(() => {
        console.log('脚本执行完成');
        process.exit(0);
    })
    .catch((error) => {
        console.error('脚本执行失败:', error);
        process.exit(1);
    });

