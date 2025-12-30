import { Box, Flex, Stack, Text, Group, Button, Image, Badge, Popover, UnstyledButton, rem } from '@mantine/core';
import { IconPhoto } from '@tabler/icons-react';
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
}

export function ProductItem({ product, onEdit, isMobile }: ProductItemProps) {
  const images = Array.isArray(product.images) ? product.images : [];
  const mainImage = images[0];
  const variantsCount = product.variants?.length || 0;
  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0;
  
  const prices = product.variants?.map(v => Number(v.price)) || [];
  const minPrice = prices.length > 0 ? Math.min(...prices) : product.priceRef;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : product.priceRef;
  const priceDisplay = minPrice === maxPrice ? `¥${minPrice}` : `¥${minPrice}-${maxPrice}`;

  if (isMobile) {
    return (
      <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
        <Flex gap="sm">
          <Box pos="relative" w={80} h={80} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <Image src={mainImage} radius="sm" w={80} h={80} fit="cover" alt={product.name} />
            ) : (
              <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={24} color="#ddd" />
              </Box>
            )}
            {product.status === 'INACTIVE' && (
              <Box pos="absolute" bottom={0} left={0} right={0} bg="rgba(0,0,0,0.6)" py={2} style={{ borderBottomLeftRadius: rem(4), borderBottomRightRadius: rem(4) }}>
                <Text size="10px" c="white" ta="center">已下架</Text>
              </Box>
            )}
          </Box>

          <Stack gap={2} style={{ flex: 1, overflow: 'hidden' }}>
            <Text size="sm" fw={700} lineClamp={1} style={{ lineHeight: 1.3 }}>
              {product.name}
            </Text>
            
            <Group gap={4} mt={1}>
              <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
              {product.channels?.map(pc => (
                <Box key={pc.channel.code} style={{ display: 'flex', alignItems: 'center' }}>
                  {pc.channel.icon ? (
                    <Image src={pc.channel.icon} w={14} h={14} radius="xs" alt={pc.channel.name} />
                  ) : (
                    <Badge size="xs" variant="outline" color="gray" px={2} h={14} radius="xs" style={{ border: '1px solid #eee', color: '#999', fontSize: '8px', lineHeight: '12px' }}>
                      {pc.channel.name.slice(0, 1)}
                    </Badge>
                  )}
                </Box>
              ))}
            </Group>

            {product.categories && product.categories.length > 0 && (
              <Group gap={4} mt={2}>
                {product.categories.slice(0, 3).map(c => (
                  <Badge key={c.category.id} variant="light" color="blue" size="xs" radius="xs" style={{ fontSize: '9px', height: '16px' }}>
                    {c.category.name}
                  </Badge>
                ))}
                {product.categories.length > 3 && <Text size="10px" c="dimmed">...</Text>}
              </Group>
            )}

            <Group gap="xs" mt={2}>
              <Text size="xs" c="dimmed">月售 0</Text>
              <Text size="xs" c="dimmed">库存 {totalStock}</Text>
            </Group>
            <Group gap={4} align="baseline" mt={2}>
              <Text size="md" c="red.7" fw={700}>{priceDisplay}</Text>
            </Group>

            <Group justify="flex-end" gap="xs" mt="auto">
              <Button variant="outline" color="gray" size="compact-xs" radius="xl" fw={400} px="sm" style={{ borderColor: '#eee' }}>
                价格/库存
              </Button>
              <Button variant="outline" color="gray" size="compact-xs" radius="xl" fw={400} px="sm" style={{ borderColor: '#eee' }}>
                下架
              </Button>
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
    <Box py="md" style={{ borderBottom: `${rem(1)} solid #f5f5f5` }}>
      <Flex align="center">
        <Flex gap="sm" style={{ width: '35%', overflow: 'hidden' }}>
          <Box pos="relative" w={80} h={80} style={{ flexShrink: 0 }}>
            {mainImage ? (
              <Image src={mainImage} radius="sm" w={80} h={80} fit="cover" alt={product.name} />
            ) : (
              <Box w={80} h={80} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: rem(4) }}>
                <IconPhoto size={24} color="#ddd" />
              </Box>
            )}
            {product.status === 'INACTIVE' && (
              <Box pos="absolute" bottom={0} left={0} right={0} bg="rgba(0,0,0,0.6)" py={2} style={{ borderBottomLeftRadius: rem(4), borderBottomRightRadius: rem(4) }}>
                <Text size="10px" c="white" ta="center">已下架</Text>
              </Box>
            )}
          </Box>
          <Stack gap={4} justify="center" style={{ overflow: 'hidden' }}>
            <Text size="sm" fw={600} lineClamp={1} style={{ cursor: 'pointer' }} onClick={() => onEdit(product.id)}>
              {product.name}
            </Text>
            <Group gap={6} align="center">
              <Text size="xs" c="dimmed">SPU: {product.displayId}</Text>
              <Group gap={4}>
                {product.channels?.map(pc => (
                  <Box key={pc.channel.code} style={{ display: 'flex', alignItems: 'center' }}>
                    {pc.channel.icon ? (
                      <Image src={pc.channel.icon} w={16} h={16} radius="xs" alt={pc.channel.name} />
                    ) : (
                      <Badge size="xs" variant="outline" color="gray" px={4} radius="xs" style={{ border: '1px solid #eee', color: '#999', fontSize: '9px' }}>
                        {pc.channel.name.slice(0, 2)}
                      </Badge>
                    )}
                  </Box>
                ))}
              </Group>
            </Group>

            {product.categories && product.categories.length > 0 && (
              <Group gap={4}>
                {product.categories.slice(0, 5).map(c => (
                  <Badge key={c.category.id} variant="light" color="blue" size="xs" radius="xs" style={{ fontSize: '9px', height: '16px' }}>
                    {c.category.name}
                  </Badge>
                ))}
                {product.categories.length > 5 && <Text size="10px" c="dimmed">...</Text>}
              </Group>
            )}
          </Stack>
        </Flex>

        <Box style={{ width: '20%' }} px="xs">
          <Text size="xs" c="dimmed">条形码: -</Text>
          <Text size="xs" c="dimmed">店内码/货号: {product.variants?.[0]?.storeCode || '-'}</Text>
          {variantsCount > 1 && (
            <Popover width={400} position="bottom" withArrow shadow="md">
              <Popover.Target>
                <Text size="xs" c="blue.6" style={{ cursor: 'pointer' }}>查看全部 {variantsCount} 个规格</Text>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <VariantsPopover variants={product.variants} />
              </Popover.Dropdown>
            </Popover>
          )}
        </Box>

        <Box style={{ width: '15%' }} px="xs">
          <Text size="sm" fw={700} c="red.7">{priceDisplay}</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm">0</Text>
        </Box>

        <Box style={{ width: '10%' }} px="xs" ta="center">
          <Text size="sm">{totalStock}</Text>
        </Box>

        <Stack gap={4} style={{ width: '10%' }} align="flex-end">
          <UnstyledButton onClick={() => onEdit(product.id)}>
            <Text size="xs" c="orange.7">编辑</Text>
          </UnstyledButton>
          <UnstyledButton>
            <Text size="xs" c="orange.7">{product.status === 'ACTIVE' ? '下架' : '上架'}</Text>
          </UnstyledButton>
          <UnstyledButton>
            <Text size="xs" c="orange.7">删除</Text>
          </UnstyledButton>
        </Stack>
      </Flex>
    </Box>
  );
}
