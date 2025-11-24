import { useState, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { addDays, subDays } from 'date-fns';

interface UseDateRangeStorageProps {
    key: string;
    defaultDays?: number;
}

export function useDateRangeStorage({
    key,
    defaultDays = 15
}: UseDateRangeStorageProps) {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    // 获取默认日期范围（当天前后15天）
    const getDefaultDateRange = (): DateRange => {
        const today = new Date();
        return {
            from: subDays(today, defaultDays),
            to: addDays(today, defaultDays)
        };
    };

    // 从 localStorage 加载日期范围
    const loadDateRange = (): DateRange | undefined => {
        try {
            if (typeof window === 'undefined') return undefined;

            const stored = localStorage.getItem(key);
            if (!stored) return undefined;

            const parsed = JSON.parse(stored);
            if (!parsed.from || !parsed.to) return undefined;

            return {
                from: new Date(parsed.from),
                to: new Date(parsed.to)
            };
        } catch (error) {
            console.warn(`Failed to load date range from localStorage for key "${key}":`, error);
            return undefined;
        }
    };

    // 保存日期范围到 localStorage
    const saveDateRange = (range: DateRange | undefined) => {
        try {
            if (typeof window === 'undefined') return;

            if (!range) {
                localStorage.removeItem(key);
                return;
            }

            const toStore = {
                from: range.from?.toISOString(),
                to: range.to?.toISOString()
            };

            localStorage.setItem(key, JSON.stringify(toStore));
        } catch (error) {
            console.warn(`Failed to save date range to localStorage for key "${key}":`, error);
        }
    };

    // 初始化：从 storage 加载或设置默认值
    useEffect(() => {
        const storedRange = loadDateRange();
        const finalRange = storedRange || getDefaultDateRange();
        setDateRange(finalRange);
    }, [key]);

    // 更新日期范围并保存到 storage
    const updateDateRange = (newRange: DateRange | undefined) => {
        setDateRange(newRange);
        saveDateRange(newRange);
    };

    // 重置为默认范围
    const resetToDefault = () => {
        const defaultRange = getDefaultDateRange();
        updateDateRange(defaultRange);
    };

    return {
        dateRange,
        setDateRange: updateDateRange,
        resetToDefault,
        isLoaded: dateRange !== undefined
    };
}