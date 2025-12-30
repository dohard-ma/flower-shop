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
    <Box w={isMobile ? 100 : 160} bg="#f8f8f8" style={{ borderRight: '1px solid #f0f0f0', position: 'relative' }}>
      <Flex direction="column" h="100%">
        <Box bg={activeMenuId === 'all' ? 'white' : 'transparent'}>
          <UnstyledButton
            w="100%"
            p={isMobile ? "md" : "lg"}
            style={{
              borderLeft: activeMenuId === 'all' ? `${rem(4)} solid #fab005` : 'none',
              backgroundColor: activeMenuId === 'all' ? '#fff' : 'transparent',
            }}
            onClick={() => onCategoryClick('all')}
          >
            <Stack gap={0} align="center">
              <Text size="sm" ta="center" fw={activeMenuId === 'all' ? 700 : 400}>全部</Text>
              <Text size="10px" c="dimmed">{summaryCounts.all} 商品</Text>
            </Stack>
          </UnstyledButton>
        </Box>

        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            {getTreeCategories().map((category) => (
              <UnstyledButton
                key={category.id}
                p={isMobile ? "xs" : "sm"}
                style={{
                  borderLeft: activeMenuId === category.id ? `${rem(4)} solid #fab005` : 'none',
                  backgroundColor: activeMenuId === category.id ? '#fff' : 'transparent',
                  paddingLeft: rem(category.depth * 12 + (isMobile ? 8 : 16)),
                  transition: 'all 0.2s'
                }}
                onClick={() => onCategoryClick(category.id)}
              >
                <Stack gap={0}>
                  <Text
                    size="sm"
                    fw={activeMenuId === category.id ? 700 : 400}
                    lineClamp={1}
                    c={category.depth > 0 ? 'dimmed' : undefined}
                  >
                    {category.name}
                  </Text>
                  <Text size="10px" c="dimmed">
                    {category._count?.products || 0} 商品
                  </Text>
                </Stack>
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea>

        <Box bg={activeMenuId === 'uncategorized' ? 'white' : 'transparent'} style={{ borderTop: '1px solid #f0f0f0' }}>
          <UnstyledButton
            w="100%"
            p={isMobile ? "xs" : "sm"}
            style={{
              borderLeft: activeMenuId === 'uncategorized' ? `${rem(4)} solid #fab005` : 'none',
              backgroundColor: activeMenuId === 'uncategorized' ? '#fff' : 'transparent',
            }}
            onClick={() => onCategoryClick('uncategorized')}
          >
            <Stack gap={0} align="center">
              <Group gap={4} justify="center">
                <Text size="xs" fw={activeMenuId === 'uncategorized' ? 700 : 400}>未分类</Text>
                <IconInfoCircle size={12} color="#999" />
              </Group>
              <Text size="10px" c="dimmed">{summaryCounts.uncategorized} 商品</Text>
            </Stack>
          </UnstyledButton>
        </Box>
      </Flex>
    </Box>
  );
}


