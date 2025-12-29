import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniqueFilename,
  uploadImage,
  OSS_DIR
} from '@/lib/qiniu';
import { ApiResponseBuilder } from '@/lib/api-response';

// POST: 文件上传
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "No file provided in form data under key 'file'."
        },
        { status: 400 }
      );
    }

    const uploadType = request.nextUrl.searchParams.get('type') as
      | 'coverImage'
      | 'images'
      | 'channelIcon'
      | null;
    if (!uploadType || !['coverImage', 'images', 'channelIcon'].includes(uploadType)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing or invalid 'type' query parameter (e.g., ?type=coverImage or ?type=images)."
        },
        { status: 400 }
      );
    }

    let directory = '';
    switch (uploadType) {
      case 'images':
        directory = OSS_DIR.PRODUCTS.IMAGES;
        break;
      case 'channelIcon':
        directory = OSS_DIR.CHANNELS.ICON;
        break;
      case 'coverImage':
        // 如果有封面图目录可以加在这里，目前先复用产品图片目录或指定新目录
        directory = OSS_DIR.PRODUCTS.IMAGES;
        break;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFilename = generateUniqueFilename(file.name);
    const imageUrl = await uploadImage(buffer, uniqueFilename, directory);
    return ApiResponseBuilder.success('trace-id', {
      url: imageUrl
    });


  } catch (error: any) {
    console.error('File upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error.message || 'An unexpected error occurred during file upload.',
        error: error.toString() // Optionally include error details for debugging (be careful in production)
      },
      { status: 500 }
    );
  }
}
