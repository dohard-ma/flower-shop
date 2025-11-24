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
      | 'giftCard'
      | null;
    if (!uploadType || !['coverImage', 'images', 'giftCard'].includes(uploadType)) {
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
      case 'coverImage':
        directory = OSS_DIR.PRODUCTS.COVER;
        break;
      case 'images':
        directory = OSS_DIR.PRODUCTS.IMAGES;
        break;
      case 'giftCard':
        // 礼品卡封面
        directory = OSS_DIR.PRODUCTS.GIFT_CARD;
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
