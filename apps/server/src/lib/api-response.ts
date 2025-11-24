import { NextResponse } from 'next/server';
import { Logger } from './logger';

export interface ApiErrorDetail {
  code?: string;
  field?: string;
  message: string;
}

export type ApiResponse<TData = void> = {
  success: boolean;
  message?: string;
  data?: TData;
  errors?: ApiErrorDetail[];
  traceId?: string;
};

export class ApiResponseBuilder {
  static success<TData>(
    traceId: string,
    data: TData,
    message: string = 'success',
    cost?: number
  ): NextResponse<ApiResponse<TData>> {
    Logger.success(
      traceId,
      '[SUCCESS] 请求成功',
      cost ? { cost, data } : { data }
    );
    return NextResponse.json({
      success: true,
      data,
      message,
      traceId
    });
  }

  static error(
    traceId: string,
    message: string,
    status: number = 400,
    errors?: ApiErrorDetail[]
  ): NextResponse<ApiResponse<void>> {
    Logger.error(traceId, '[ERROR] 请求失败', { message, errors });
    return NextResponse.json(
      {
        success: false,
        message,
        errors,
        traceId
      },
      { status }
    );
  }
}
