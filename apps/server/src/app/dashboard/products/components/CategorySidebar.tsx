import { Group, Box, Flex, Stack, Text, UnstyledButton, ScrollArea, rem } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { StoreCategory, SummaryCounts } from '../types';

/**
 * 商品分类导航侧边栏
 * 支持树形目录展开、各分类商品数量统计
 */
interface CategorySidebarProps {
  categories: StoreCategory[]; // 分类列表数据
  activeMenuId: string;        // 当前选中的分类 ID
  summaryCounts: SummaryCounts; // 顶部“全部”和“未分类”的统计数
  onCategoryClick: (id: string) => void; // 点击切换分类的回调
  isMobile: boolean;           // 是否移动端显示
}

export function CategorySidebar({ categories, activeMenuId, summaryCounts, onCategoryClick, isMobile }: CategorySidebarProps) {
  const getTreeCategories = () => {
    const rootNodes = categories.filter(c => !c.parentId);
    const sortedNodes: (StoreCategory & { depth: number })[] = [];

    const addChildren = (parent: StoreCategory, depth: number) => {
      sortedNodes.push({ ...parent, depth });
      const children = categories.filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      children.forEach(child => addChildren(child, depth + 1));
    };

    rootNodes.sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(root => addChildren(root, 0));

    return sortedNodes;
  };

  return (
    <Box w={isMobile ? 120 : 180} h="100%" bg="#fdfdfd" style={{ borderRight: '1px solid #f0f0f0', position: 'relative' }}>
      <Flex direction="column" h="100%">
        <UnstyledButton
          w="100%"
          p={isMobile ? "sm" : "md"}
          style={{
            backgroundColor: activeMenuId === 'all' ? '#fff' : 'transparent',
            borderBottom: '1px solid #f5f5f5',
            borderLeft: activeMenuId === 'all' ? `${rem(2)} solid var(--mantine-color-yellow-6)` : '2px solid transparent',
          }}
          onClick={() => onCategoryClick('all')}
        >
          <Stack gap={0} align={isMobile ? "flex-start" : "flex-start"}>
            <Text size="sm" fw={activeMenuId === 'all' ? 600 : 400} c={activeMenuId === 'all' ? 'black' : 'gray.7'}>
                全部商品
            </Text>
            {!isMobile && <Text size="10px" c="dimmed">{summaryCounts.all}</Text>}
          </Stack>
        </UnstyledButton>

        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            {getTreeCategories().map((category) => (
              <UnstyledButton
                key={category.id}
                p={isMobile ? "sm" : "sm"}
                px={isMobile ? "sm" : "md"}
                style={{
                  backgroundColor: activeMenuId === category.id ? '#fff' : 'transparent',
                  paddingLeft: isMobile ? rem(category.depth * 8 + 8) : rem(category.depth * 12 + 16),
                  borderLeft: activeMenuId === category.id ? `${rem(2)} solid var(--mantine-color-yellow-6)` : '2px solid transparent',
                }}
                onClick={() => onCategoryClick(category.id)}
              >
                <Flex justify="space-between" align="center" gap={8}>
                    <Text
                        size="sm"
                        fw={activeMenuId === category.id ? 600 : 400}
                        c={activeMenuId === category.id ? 'black' : 'gray.7'}
                        style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}
                    >
                        {category.name}
                    </Text>
                    {!isMobile && (
                        <Text size="10px" c="dimmed" bg="gray.0" px={4} style={{ borderRadius: 10, flexShrink: 0 }}>
                            {category._count?.products || 0}
                        </Text>
                    )}
                </Flex>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea>

        <Box p="xs" style={{ borderTop: '1px solid #f0f0f0', bg: 'white' }}>
            <UnstyledButton
                w="100%"
                p="xs"
                style={{
                    borderRadius: rem(8),
                    backgroundColor: activeMenuId === 'uncategorized' ? '#fff' : 'transparent',
                    borderLeft: activeMenuId === 'uncategorized' ? `${rem(2)} solid var(--mantine-color-yellow-6)` : '2px solid transparent',
                }}
                onClick={() => onCategoryClick('uncategorized')}
            >
                <Group gap={8} justify={isMobile ? "flex-start" : "flex-start"} wrap="nowrap">
                    <IconInfoCircle size={16} color={activeMenuId === 'uncategorized' ? 'var(--mantine-color-yellow-6)' : 'var(--mantine-color-gray-5)'} style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={activeMenuId === 'uncategorized' ? 600 : 400} c={activeMenuId === 'uncategorized' ? 'black' : 'gray.7'} style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        未分类
                    </Text>
                    {!isMobile && <Text size="10px" c="dimmed" ml="auto">{summaryCounts.uncategorized}</Text>}
                </Group>
            </UnstyledButton>
        </Box>
      </Flex>
    </Box>
  );
}


