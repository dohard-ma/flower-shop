/**
 * 空状态组件
 *
 * 职责：
 * - 展示无数据状态
 * - 支持自定义图标和文案
 */

interface EmptyStateProps {
    /** 标题 */
    title?: string;
    /** 描述 */
    description?: string;
    /** 自定义图标 */
    icon?: React.ReactNode;
}

/**
 * 空状态组件
 */
export function EmptyState({
    title = '暂无商品',
    description = '没有找到符合条件的商品，试试调整筛选条件吧。',
    icon,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                {icon || (
                    <svg
                        className="w-8 h-8 text-gray-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                    </svg>
                )}
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 text-center max-w-sm">{description}</p>
        </div>
    );
}










