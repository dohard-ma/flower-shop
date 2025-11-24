'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, X, ChevronRight } from 'lucide-react';

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export interface HierarchicalOption {
    label: string;
    value?: string; // value 可选，如果没有 value，则使用 label 作为 value
    children?: HierarchicalOption[];
}

interface HierarchicalMultiSelectProps {
    options: HierarchicalOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    maxCount?: number;
    className?: string;
}

export function HierarchicalMultiSelect({
    options,
    selected,
    onChange,
    placeholder = '请选择...',
    disabled = false,
    maxCount = 999,
    className,
}: HierarchicalMultiSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
    const [searchValue, setSearchValue] = React.useState('');

    // 确保组件已挂载，避免水合失败
    React.useEffect(() => {
        setMounted(true);
    }, []);

    // 获取所有选项（扁平化）
    const getAllOptions = React.useMemo(() => {
        const all: Array<{ label: string; value: string; group?: string }> = [];
        options.forEach((group) => {
            if (group.children) {
                group.children.forEach((item) => {
                    all.push({
                        label: item.label,
                        value: item.value || item.label, // 如果没有 value，使用 label
                        group: group.label
                    });
                });
            } else {
                all.push({
                    label: group.label,
                    value: group.value || group.label // 如果没有 value，使用 label
                });
            }
        });
        return all;
    }, [options]);

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

    const toggleGroup = (groupValue: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(groupValue)) {
                next.delete(groupValue);
            } else {
                next.add(groupValue);
            }
            return next;
        });
    };

    // 模糊匹配函数
    const fuzzyMatch = React.useCallback((text: string, search: string): boolean => {
        if (!search) return true;
        const lowerText = text.toLowerCase();
        const lowerSearch = search.toLowerCase();
        return lowerText.includes(lowerSearch);
    }, []);

    // 根据搜索关键词过滤选项
    const filteredOptions = React.useMemo(() => {
        if (!searchValue) return options;

        return options
            .map((group) => {
                const groupMatches = fuzzyMatch(group.label, searchValue);
                const groupValue = group.value || group.label;

                if (group.children && group.children.length > 0) {
                    // 过滤子项
                    const filteredChildren = group.children.filter((item) =>
                        fuzzyMatch(item.label, searchValue)
                    );

                    // 如果父级匹配或子级有匹配项，则显示该分组
                    if (groupMatches || filteredChildren.length > 0) {
                        return {
                            ...group,
                            children: groupMatches ? group.children : filteredChildren
                        };
                    }
                    return null;
                } else {
                    // 没有子项的分组，直接匹配
                    if (groupMatches) {
                        return group;
                    }
                    return null;
                }
            })
            .filter((group): group is HierarchicalOption => group !== null);
    }, [options, searchValue, fuzzyMatch]);

    // 当搜索时，自动展开匹配的分组
    React.useEffect(() => {
        if (searchValue) {
            const groupsToExpand = new Set<string>();
            filteredOptions.forEach((group) => {
                const groupValue = group.value || group.label;
                const hasMatchingChildren = group.children && group.children.some((item) =>
                    fuzzyMatch(item.label, searchValue)
                );
                const groupMatches = fuzzyMatch(group.label, searchValue);

                if (hasMatchingChildren || groupMatches) {
                    groupsToExpand.add(groupValue);
                }
            });

            if (groupsToExpand.size > 0) {
                setExpandedGroups((prev) => {
                    const next = new Set(prev);
                    groupsToExpand.forEach((groupValue) => {
                        next.add(groupValue);
                    });
                    return next;
                });
            }
        } else {
            // 清空搜索时，可以选择收起所有分组或保持当前状态
            // 这里保持当前状态，不清空
        }
    }, [searchValue, filteredOptions, fuzzyMatch]);

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

    // 当 Popover 关闭时，清空搜索值
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen) {
            setSearchValue('');
        }
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
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
                        {selected.slice(0, 3).map((item) => {
                            const option = getAllOptions.find((opt) => opt.value === item);
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
                        {selected.length > 3 && (
                            <Badge variant="secondary" className="mr-1 mb-1">
                                +{selected.length - 3} 更多...
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
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="搜索选项..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                    />
                    <CommandEmpty>未找到选项。</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                        {filteredOptions.map((group) => {
                            const hasChildren = group.children && group.children.length > 0;
                            const groupValue = group.value || group.label;
                            const isExpanded = expandedGroups.has(groupValue);

                            if (hasChildren) {
                                return (
                                    <Collapsible
                                        key={groupValue}
                                        open={isExpanded}
                                        onOpenChange={() => toggleGroup(groupValue)}
                                    >
                                        <CollapsibleTrigger asChild>
                                            <CommandItem
                                                onSelect={(e: string | Event) => {
                                                    // 如果传递的是事件对象，尝试阻止默认行为
                                                    if (typeof e !== 'string' && e && typeof (e as any).preventDefault === 'function') {
                                                        (e as any).preventDefault();
                                                    }
                                                    // 切换分组展开/收起状态
                                                    toggleGroup(groupValue);
                                                }}
                                                className="font-semibold"
                                            >
                                                <ChevronRight
                                                    className={cn(
                                                        'mr-2 h-4 w-4 transition-transform',
                                                        isExpanded && 'rotate-90'
                                                    )}
                                                />
                                                {group.label}
                                            </CommandItem>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent>
                                            {group.children?.map((item) => {
                                                const itemValue = item.value || item.label;
                                                return (
                                                    <CommandItem
                                                        key={itemValue}
                                                        onSelect={() => handleSelect(itemValue)}
                                                        className="pl-8"
                                                    >
                                                        <Check
                                                            className={cn(
                                                                'mr-2 h-4 w-4',
                                                                selected.includes(itemValue)
                                                                    ? 'opacity-100'
                                                                    : 'opacity-0'
                                                            )}
                                                        />
                                                        {item.label}
                                                    </CommandItem>
                                                );
                                            })}
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            } else {
                                const groupValue = group.value || group.label;
                                return (
                                    <CommandItem
                                        key={groupValue}
                                        onSelect={() => handleSelect(groupValue)}
                                    >
                                        <Check
                                            className={cn(
                                                'mr-2 h-4 w-4',
                                                selected.includes(groupValue)
                                                    ? 'opacity-100'
                                                    : 'opacity-0'
                                            )}
                                        />
                                        {group.label}
                                    </CommandItem>
                                );
                            }
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

