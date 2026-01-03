import { Box, Flex, Stack, Text, Group, Button, Image as MantineImage, Badge, UnstyledButton, rem, Checkbox } from '@mantine/core';
import { IconPhoto, IconPencil, IconDots } from '@tabler/icons-react';
import { VariantsPopover } from './VariantsPopover';
import { Product } from '../types';

/**
 * 单个商品项渲染组件
 * 支持响应式布局：桌面端表格行模式 & 移动端卡片模式
 */
interface ProductItemProps {
  product: Product;           // 商品详细数据
  onEdit: (id: string) => void; // 点击编辑按钮的回调
  isMobile: boolean;          // 是否移动端显示
  selected?: boolean;         // 是否选中
  onSelect?: (selected: boolean) => void; // 选中状态改变回调
  onUpdate?: (updatedProduct: Product) => void; // 更新成功后的回调
}

import { EditableTitle } from './EditableTitle';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';

export function ProductItem({ product, onEdit, isMobile, selected, onSelect, onUpdate }: ProductItemProps) {
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0];
  const variantsCount = product.variants?.length || 0;
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  
  const prices = product.variants?.map(v => Number(v.price)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const priceDisplay = minPrice === maxPrice ? minPrice.toFixed(2) : `${minPrice.toFixed(2)}-${maxPrice.toFixed(2)}`;

  if (isMobile) {
    return (
      <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
        <Flex gap="sm">
          <Box pos="relative" w={80} h={80} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <MantineImage src={mainImage} radius="sm" w={80} h={80} fit="cover" alt={product.name} />
            ) : (
              <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={24} color="#ddd" />
              </Box>
            )}
          </Box>

          <Stack gap={2} style={{ flex: 1, overflow: 'hidden' }}>
            <Text size="sm" fw={700} lineClamp={1} style={{ lineHeight: 1.3 }}>
              {product.name}
            </Text>
            
            <Group gap={4} mt={1}>
              <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
            </Group>

            <Group gap="xs" mt={2}>
              <Text size="xs" c="dimmed">库存 {totalStock}</Text>
              <Text size="xs" c="red.7" fw={700}>¥{priceDisplay}</Text>
            </Group>

            <Group justify="flex-end" gap="xs" mt="auto">
              <Button
                variant="outline"
                color="gray"
                size="compact-xs"
                radius="xl"
                fw={400}
                px="sm"
                style={{ borderColor: '#eee' }}
                onClick={() => onEdit(product.id)}
              >
                编辑
              </Button>
            </Group>
          </Stack>
        </Flex>
      </Box>
    );
  }

  return (
    <Box py="sm" style={{ borderBottom: `${rem(1)} solid #f1f3f5` }}>
      <Flex align="center">
        <Box style={{ width: 40 }}>
          <Checkbox 
            size="xs" 
            checked={selected}
            onChange={(e) => onSelect?.(e.currentTarget.checked)}
          />
        </Box>
        
        <Flex gap="md" style={{ width: '35%', overflow: 'hidden' }} align="center">
          <Box pos="relative" w={56} h={56} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <MantineImage src={mainImage} radius="sm" w={56} h={56} fit="cover" alt={product.name} />
            ) : (
              <Box w={56} h={56} bg="gray.0" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={20} color="#dee2e6" />
              </Box>
            )}
          </Box>
          <Stack gap={0} justify="center" style={{ overflow: 'hidden', flex: 1 }}>
            <EditableTitle 
              value={product.name}
              onSave={async (newTitle) => {
                try {
                  const res = await http.put(`/api/admin/products?id=${product.id}`, { name: newTitle });
                  notifications.show({
                    title: '更新成功',
                    message: '商品标题已修改',
                    color: 'green',
                  });
                  onUpdate?.({ ...product, name: newTitle });
                } catch (e) {
                  notifications.show({
                    title: '更新失败',
                    message: '请稍后重试',
                    color: 'red',
                  });
                  throw e;
                }
              }}
            />
            <Group gap={6} wrap="nowrap">
                <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
                <Group gap={4}>
                    {product.channels?.filter(c => c.isListed).map((pc) => (
                        <Box key={pc.channel.id} title={pc.channel.name}>
                            {pc.channel.icon ? (
                                <MantineImage src={pc.channel.icon} w={14} h={14} radius="xs" />
                            ) : (
                                <Box w={14} h={14} bg="gray.1" style={{ borderRadius: 2 }} />
                            )}
                        </Box>
                    ))}
                </Group>
            </Group>
            <Text size="xs" c="dimmed">条码: 69201029384</Text>
          </Stack>
        </Flex>

        <Box style={{ width: '15%' }} px="xs" ta="center">
          <Text size="sm" fw={600} c="red.7">{priceDisplay}</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm" c="gray.8">{totalStock}</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm" c="gray.8">0</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Badge 
            variant="light" 
            color={product.status === 'ACTIVE' ? 'green' : 'gray'} 
            size="sm"
            styles={{ root: { textTransform: 'none' } }}
          >
            {product.status === 'ACTIVE' ? '出售中' : '已下架'}
          </Badge>
        </Box>

        <Group gap={8} style={{ width: '10%' }} justify="flex-end" px="xs">
          <UnstyledButton onClick={() => onEdit(product.id)} p={4} style={{ borderRadius: 4, transition: 'background 0.2s' }}>
            <IconPencil size={18} color="var(--mantine-color-orange-6)" />
          </UnstyledButton>
          <UnstyledButton p={4} style={{ borderRadius: 4, transition: 'background 0.2s' }}>
            <IconDots size={18} color="var(--mantine-color-gray-5)" />
          </UnstyledButton>
        </Group>
      </Flex>
    </Box>
  );
}
