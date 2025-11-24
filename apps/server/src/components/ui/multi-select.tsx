'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: MultiSelectOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    maxCount?: number;
    className?: string;
}

export function MultiSelect({
    options,
    selected,
    onChange,
    placeholder = '请选择...',
    disabled = false,
    maxCount = 999,
    className,
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);

    // 确保组件已挂载，避免水合失败
    React.useEffect(() => {
        setMounted(true);
    }, []);

    const handleUnselect = React.useCallback((item: string) => {
        onChange(selected.filter((i) => i !== item));
    }, [selected, onChange]);

    const handleSelect = React.useCallback((item: string) => {
        if (selected.includes(item)) {
            handleUnselect(item);
        } else {
            if (selected.length < maxCount) {
                onChange([...selected, item]);
            }
        }
    }, [selected, onChange, maxCount, handleUnselect]);

    const handleClear = React.useCallback(() => {
        onChange([]);
    }, [onChange]);

    // 在服务端渲染时显示简化版本
    if (!mounted) {
        return (
            <Button
                variant="outline"
                role="combobox"
                className={cn(
                    'justify-between min-h-10 h-auto',
                    className
                )}
                disabled={true}
            >
                <div className="flex gap-1 flex-wrap">
                    {selected.length === 0 ? (
                        <span className="text-muted-foreground">{placeholder}</span>
                    ) : (
                        <span className="text-sm">
                            {selected.length} 项已选择
                        </span>
                    )}
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        'justify-between min-h-10 h-auto',
                        className
                    )}
                    disabled={disabled}
                >
                    <div className="flex gap-1 flex-wrap">
                        {selected.length === 0 && (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                        {selected.slice(0, maxCount).map((item) => {
                            const option = options.find((opt) => opt.value === item);
                            if (!option) return null;

                            return (
                                <Badge
                                    variant="secondary"
                                    key={item}
                                    className="mr-1 mb-1"
                                >
                                    {option.label}
                                    <span
                                        role="button"
                                        tabIndex={0}
                                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleUnselect(item);
                                            }
                                        }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleUnselect(item);
                                        }}
                                        aria-label={`移除 ${option.label}`}
                                    >
                                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </span>
                                </Badge>
                            );
                        })}
                        {selected.length > maxCount && (
                            <Badge variant="secondary" className="mr-1 mb-1">
                                +{selected.length - maxCount} 更多...
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                        {selected.length > 0 && (
                            <span
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleClear();
                                    }
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleClear();
                                }}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="清空所有选择"
                            >
                                <X className="h-4 w-4" />
                            </span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="搜索选项..." />
                    <CommandEmpty>未找到选项。</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {options.map((option) => (
                            <CommandItem
                                key={option.value}
                                onSelect={() => handleSelect(option.value)}
                            >
                                <Check
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        selected.includes(option.value)
                                            ? 'opacity-100'
                                            : 'opacity-0'
                                    )}
                                />
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}