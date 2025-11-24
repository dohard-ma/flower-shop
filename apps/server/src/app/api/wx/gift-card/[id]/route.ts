import { NextRequest } from 'next/server';
import { ApiResponseBuilder } from '@/lib/api-response';
import prisma from '@/lib/prisma';


// DELETE - 删除电子封面
export async function DELETE(request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = request.headers.get('X-Trace-ID')!;
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!id) {
      return ApiResponseBuilder.error(traceId, '缺少封面ID', 400);
    }

    // 直接删除即可，因为订单里存有电子封面快照，没有引用电子封面表
    await prisma.diyCover.delete({
      where: { id: parseInt(id), userId: parseInt(userId!) }
    });

    return ApiResponseBuilder.success(traceId, '电子封面删除成功');

  } catch (error) {
    console.error('删除电子封面失败:', error);
    return ApiResponseBuilder.error(traceId, '删除电子封面失败', 500);
  }
}
