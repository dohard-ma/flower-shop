'use client';

import { useState, createContext, useContext, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  BarChart2,
  Folder,
  Users2,
  Settings,
  HelpCircle,
  Menu,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip';

// 创建侧边栏状态的Context
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}>({
  isCollapsed: false,
  setIsCollapsed: () => { }
});

export const useSidebarContext = () => useContext(SidebarContext);

// 导航数据结构，支持子菜单
const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  // 订单管理
  {
    name: '订单管理',
    icon: Folder,
    children: [
      { name: '订单列表', href: '/dashboard/orders' },
      { name: '发货计划', href: '/dashboard/delivery-plans' }
    ]
  },

  {
    name: '商品管理',
    icon: Package,
    children: [
      { name: '店铺商品管理', href: '/dashboard/products' },
      { name: '订阅商品管理', href: '/dashboard/subscription-product' }
    ]
  },
  {
    name: '用户管理',
    icon: Users2,
    children: [
      { name: '用户列表', href: '/dashboard/users' },
      { name: '通知记录', href: '/dashboard/notification-records' }
    ]
  },

  // 系统管理
  {
    name: '系统设置',
    icon: Settings,
    children: [
      { name: '优惠券管理', href: '/dashboard/coupons' },
      { name: '节气管理', href: '/dashboard/seasons' },
      { name: '封面管理', href: '/dashboard/covers' },
      { name: '通知模板管理', href: '/dashboard/notification-templates' },
      { name: '通知场景管理', href: '/dashboard/notification-scenes' }
    ]
  },
  // 模板管理
  {
    name: '模板',
    icon: Folder,
    children: [
      { name: '表格', href: '/dashboard/templates/tables' },
      { name: '表单', href: '/dashboard/templates/forms' }
    ]
  }
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle }
];

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebarContext();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // 查找包含当前路径的父菜单项
  const findParentItemsForPath = (currentPath: string) => {
    const parentItems: string[] = [];

    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href === currentPath
        );
        if (hasActiveChild) {
          parentItems.push(item.name);
        }
      }
    });

    return parentItems;
  };

  // 监听路径变化，自动展开相关父菜单
  useEffect(() => {
    if (!isCollapsed) {
      const parentItems = findParentItemsForPath(pathname);
      if (parentItems.length > 0) {
        setExpandedItems((prev) => {
          const newExpanded = [...prev];
          parentItems.forEach((item) => {
            if (!newExpanded.includes(item)) {
              newExpanded.push(item);
            }
          });
          return newExpanded;
        });
      }
    }
  }, [pathname, isCollapsed]);

  // 处理菜单项展开/折叠
  const toggleExpanded = (itemName: string) => {
    if (isCollapsed) return; // 折叠模式下不展开子菜单

    setExpandedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((name) => name !== itemName)
        : [...prev, itemName]
    );
  };

  // 检查是否应该展开某个菜单项
  const isExpanded = (itemName: string) => {
    return expandedItems.includes(itemName);
  };

  // 检查路径是否匹配当前菜单项或其子项
  const isActiveItem = (item: any) => {
    if (item.href) {
      return pathname === item.href;
    }
    if (item.children) {
      return item.children.some((child: any) => pathname === child.href);
    }
    return false;
  };

  // 检查子菜单项是否激活
  const isActiveSubItem = (href: string) => {
    return pathname === href;
  };

  const NavItem = ({
    item,
    isBottom = false
  }: {
    item: {
      name: string;
      href?: string;
      icon: any;
      children?: { name: string; href: string }[];
    };
    isBottom?: boolean;
  }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isActiveItem(item);
    const expanded = isExpanded(item.name);

    if (hasChildren) {
      return (
        <div>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => toggleExpanded(item.name)}
                className={cn(
                  'flex w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
                {!isCollapsed && (
                  <>
                    <span className='flex-1'>{item.name}</span>
                    {expanded ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronRight className='h-4 w-4' />
                    )}
                  </>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side='right' className='flex items-center gap-4'>
                <div>
                  <div className='font-medium'>{item.name}</div>
                  <div className='text-xs text-muted-foreground'>
                    {item.children?.map((child) => child.name).join(', ')}
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>

          {/* 子菜单 */}
          {!isCollapsed && expanded && (
            <div className='ml-6 mt-1 space-y-1'>
              {item.children?.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    'block rounded-md px-3 py-2 text-sm transition-colors',
                    isActiveSubItem(child.href)
                      ? 'bg-secondary font-medium text-secondary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    // 普通菜单项（无子菜单）
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            href={item.href!}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground',
              isCollapsed && 'justify-center px-2'
            )}
          >
            <item.icon className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
            {!isCollapsed && <span>{item.name}</span>}
          </Link>
        </TooltipTrigger>
        {isCollapsed && (
          <TooltipContent side='right' className='flex items-center gap-4'>
            {item.name}
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <>
        <button
          className='fixed left-4 top-4 z-50 rounded-md bg-background p-2 shadow-md lg:hidden'
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label='Toggle sidebar'
        >
          <Menu className='h-6 w-6' />
        </button>
        <div
          className={cn(
            'fixed inset-y-0 z-20 flex h-screen flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
            isCollapsed ? 'w-[72px]' : 'w-72',
            isMobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          )}
        >
          {/* Header */}
          <div className='flex-shrink-0 border-b border-border'>
            <div
              className={cn(
                'flex h-16 items-center gap-2 px-4',
                isCollapsed && 'justify-center px-2'
              )}
            >
              {!isCollapsed && (
                <Link href='/' className='flex items-center font-semibold'>
                  <span className='text-lg'>花涧里</span>
                </Link>
              )}
              <Button
                variant='ghost'
                size='sm'
                className={cn('ml-auto h-8 w-8', isCollapsed && 'ml-0')}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                <ChevronLeft
                  className={cn(
                    'h-4 w-4 transition-transform',
                    isCollapsed && 'rotate-180'
                  )}
                />
                <span className='sr-only'>
                  {isCollapsed ? 'Expand' : 'Collapse'} Sidebar
                </span>
              </Button>
            </div>
          </div>

          {/* Scrollable Navigation */}
          <div className='min-h-0 flex-1 overflow-y-auto'>
            <nav className='space-y-1 px-2 py-4'>
              {navigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>
          </div>

          {/* Fixed Bottom Navigation */}
          <div className='flex-shrink-0 border-t border-border p-2'>
            <nav className='space-y-1'>
              {bottomNavigation.map((item) => (
                <NavItem key={item.name} item={item} isBottom />
              ))}
            </nav>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}
