import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { ApiResponseBuilder } from '@/lib/api-response';

// 节气验证模式
const solarTermSchema = z.object({
  name: z.string().min(1, '节气名称不能为空'),
  startTime: z.string(),
  endTime: z.string(),
  year: z.number().int().min(2000).max(2100),
  isActive: z.boolean()
});

// GET: 获取节气列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const name = searchParams.get('name') || undefined;
    const year = searchParams.get('year')
      ? parseInt(searchParams.get('year')!)
      : undefined;
    const isActive = searchParams.get('isActive')
      ? searchParams.get('isActive') === 'true'
      : undefined;

    const where = {
      ...(name && { name: { contains: name } }),
      ...(year && { year }),
      ...(isActive !== undefined && { isActive })
    };

    const [total, solarTerms] = await Promise.all([
      prisma.solarTerm.count({ where }),
      prisma.solarTerm.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { startTime: 'asc' }]
      })
    ]);

    return ApiResponseBuilder.success('trace-id', {
      data: solarTerms,
      total,
      page,
      limit
    });
  } catch (error: any) {
    console.error('获取节气列表失败:', error);
    return ApiResponseBuilder.error('trace-id', '获取节气列表失败', 500, [
      {
        message: error.message
      }
    ]);
  }
}

// POST: 创建节气
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = solarTermSchema.parse(body);

    const solarTerm = await prisma.solarTerm.create({
      data: validatedData
    });

    return NextResponse.json({
      success: true,
      data: solarTerm
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return ApiResponseBuilder.error('trace-id', '创建节气失败', 400, [
        {
          message: '数据验证失败',
        }
      ]);
    }
    return ApiResponseBuilder.error('trace-id', '创建节气失败', 500, [
      {
        message: error.message || '创建节气失败'
      }
    ]);
  }
}

// PUT: 更新节气
export async function PUT(request: NextRequest) {
  try {
    const id = parseInt(request.nextUrl.pathname.split('/').pop() || '0');
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: '无效的节气ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = solarTermSchema.parse(body);

    const solarTerm = await prisma.solarTerm.update({
      where: { id },
      data: validatedData
    });

    return ApiResponseBuilder.success('trace-id', {
      data: solarTerm
    });
  } catch (error: any) {
    console.error('更新节气失败:', error);
    if (error instanceof z.ZodError) {
      return ApiResponseBuilder.error('trace-id', '数据验证失败', 400, [
        {
          message: '数据验证失败'
        }
      ]);
    }
    return NextResponse.json(
      {
        success: false,
        message: error.message || '更新节气失败'
      },
      { status: 500 }
    );
  }
}

// DELETE: 删除节气
export async function DELETE(request: NextRequest) {
  try {
    const id = parseInt(request.nextUrl.pathname.split('/').pop() || '0');
    if (!id) {
      return ApiResponseBuilder.error('trace-id', '无效的节气ID', 400, [
        {
          message: '无效的节气ID'
        }
      ]);
    }

    await prisma.solarTerm.delete({
      where: { id }
    });

    return ApiResponseBuilder.success('trace-id', {
      message: '节气删除成功'
    });
  } catch (error: any) {
    console.error('删除节气失败:', error);
    return ApiResponseBuilder.error('trace-id', '删除节气失败', 500, [
      {
        message: error.message || '删除节气失败'
      }
    ]);
  }
}
