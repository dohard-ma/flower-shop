'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Box,
  Flex,
  Text,
  Group,
  Button,
  TextInput,
  Select,
  Table,
  Image,
  UnstyledButton,
  Collapse,
  ScrollArea,
  LoadingOverlay,
  NumberInput,
  rem,
  Badge,
} from '@mantine/core';
import { IconChevronRight, IconChevronDown, IconPhoto, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { http } from '@/lib/request';
import { Product, Channel, ProductVariant } from '../types';

interface BatchChannelPriceModalProps {
  opened: boolean;
  onClose: () => void;
  products: Product[];
  channels: Channel[];
  onSuccess: () => void;
}

// 定价策略
type PricingRule = 'same' | 'plus5' | 'plus10' | 'plus15' | 'plus20';

const PRICING_RULES: { value: PricingRule; label: string; multiplier: number }[] = [
  { value: 'same', label: '与小程序相同', multiplier: 1 },
  { value: 'plus5', label: '+5%', multiplier: 1.05 },
  { value: 'plus10', label: '+10%', multiplier: 1.1 },
  { value: 'plus15', label: '+15%', multiplier: 1.15 },
  { value: 'plus20', label: '+20%', multiplier: 1.2 },
];

// 单个 SKU 的渠道价格编辑状态
interface VariantChannelPrice {
  variantId: string;
  channelId: string;
  price: number | null;
}

export function BatchChannelPriceModal({
  opened,
  onClose,
  products,
  channels,
  onSuccess,
}: BatchChannelPriceModalProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [priceEdits, setPriceEdits] = useState<Map<string, number | null>>(new Map());
  const [selectedRule, setSelectedRule] = useState<PricingRule>('plus10');
  const [saving, setSaving] = useState(false);

  // 获取小程序渠道（作为基准价格来源）
  const wechatChannel = useMemo(() => channels.find(c => c.code === 'wechat_mini'), [channels]);

  // 初始化价格编辑状态
  useEffect(() => {
    if (!opened) return;
    const initialEdits = new Map<string, number | null>();
    
    products.forEach(product => {
      product.variants?.forEach(variant => {
        channels.forEach(channel => {
          const key = `${variant.id}_${channel.id}`;
          // 从 channelData 获取已有价格
          const existingPrice = variant.channelData?.[channel.code]?.price;
          initialEdits.set(key, existingPrice ?? null);
        });
      });
    });
    
    setPriceEdits(initialEdits);
    setExpandedIds(new Set());
  }, [opened, products, channels]);

  // 切换展开/折叠
  const toggleExpand = (productId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // 更新单个价格
  const updatePrice = (variantId: string, channelId: string, price: number | null) => {
    const key = `${variantId}_${channelId}`;
    setPriceEdits(prev => new Map(prev).set(key, price));
  };

  // 应用规则到所有
  const applyRuleToAll = () => {
    const rule = PRICING_RULES.find(r => r.value === selectedRule);
    if (!rule) return;

    const newEdits = new Map(priceEdits);
    
    products.forEach(product => {
      product.variants?.forEach(variant => {
        const basePrice = Number(variant.price) || 0;
        channels.forEach(channel => {
          // 跳过小程序渠道本身
          if (channel.code === 'wechat_mini') {
            newEdits.set(`${variant.id}_${channel.id}`, basePrice);
          } else {
            const calculatedPrice = Math.round(basePrice * rule.multiplier * 100) / 100;
            newEdits.set(`${variant.id}_${channel.id}`, calculatedPrice);
          }
        });
      });
    });
    
    setPriceEdits(newEdits);
    notifications.show({
      title: '规则已应用',
      message: `已将 "${rule.label}" 规则应用到所有商品`,
      color: 'blue',
    });
  };

  // 保存
  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: { variantId: string; channelId: string; price: number | null }[] = [];
      
      priceEdits.forEach((price, key) => {
        const [variantId, channelId] = key.split('_');
        updates.push({ variantId, channelId, price });
      });

      await http.post('/api/admin/products/channel-prices', { updates });
      
      notifications.show({
        title: '保存成功',
        message: '渠道价格已更新',
        color: 'green',
      });
      
      onSuccess();
      onClose();
    } catch (e) {
      notifications.show({
        title: '保存失败',
        message: '请稍后重试',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  // 获取价格显示
  const getPrice = (variantId: string, channelId: string): number | null => {
    return priceEdits.get(`${variantId}_${channelId}`) ?? null;
  };

  // 渲染价格输入框
  const renderPriceInput = (variant: ProductVariant, channel: Channel) => {
    const price = getPrice(variant.id, channel.id);
    return (
      <NumberInput
        size="xs"
        value={price ?? ''}
        onChange={(val) => updatePrice(variant.id, channel.id, val === '' ? null : Number(val))}
        placeholder="--"
        min={0}
        decimalScale={2}
        hideControls
        styles={{
          input: {
            width: rem(80),
            textAlign: 'center',
          },
        }}
      />
    );
  };

  // 渲染商品行
  const renderProductRow = (product: Product) => {
    const variants = product.variants || [];
    const isMultiVariant = variants.length > 1;
    const isExpanded = expandedIds.has(product.id);
    const mainImage = product.images?.[0];

    // 单规格：直接显示价格输入
    if (!isMultiVariant && variants.length === 1) {
      const variant = variants[0];
      return (
        <Table.Tr key={product.id}>
          <Table.Td>
            <Flex gap="sm" align="center">
              <Box style={{ width: rem(20) }} /> {/* 占位，与多规格的展开按钮对齐 */}
              <Box w={48} h={48} style={{ flexShrink: 0 }}>
                {mainImage ? (
                  <Image src={mainImage} w={48} h={48} radius="sm" fit="cover" />
                ) : (
                  <Box w={48} h={48} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <IconPhoto size={18} color="#ccc" />
                  </Box>
                )}
              </Box>
              <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
                {product.name}
              </Text>
            </Flex>
          </Table.Td>
          {channels.map(channel => (
            <Table.Td key={channel.id} style={{ textAlign: 'center' }}  align="center">
              {renderPriceInput(variant, channel)}
            </Table.Td>
          ))}
        </Table.Tr>
      );
    }

    // 多规格：显示展开按钮
    return (
      <>
        <Table.Tr key={product.id} style={{ cursor: 'pointer' }} onClick={() => toggleExpand(product.id)}>
          <Table.Td>
            <Flex gap="sm" align="center">
              <UnstyledButton style={{ width: rem(20), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isExpanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </UnstyledButton>
              <Box w={48} h={48} style={{ flexShrink: 0 }}>
                {mainImage ? (
                  <Image src={mainImage} w={48} h={48} radius="sm" fit="cover" />
                ) : (
                  <Box w={48} h={48} bg="gray.1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4 }}>
                    <IconPhoto size={18} color="#ccc" />
                  </Box>
                )}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text size="sm" fw={500} lineClamp={1}>
                  {product.name}
                </Text>
                <Badge size="xs" variant="light" color="gray" mt={2}>{variants.length} 个规格</Badge>
              </Box>
            </Flex>
          </Table.Td>
          {channels.map(channel => (
            <Table.Td key={channel.id} style={{ textAlign: 'center' }}>
              <Text size="xs" c="dimmed">多规格</Text>
            </Table.Td>
          ))}
        </Table.Tr>
        {isExpanded && variants.map((variant, idx) => (
          <Table.Tr key={variant.id} bg="gray.0">
            <Table.Td style={{ paddingLeft: rem(68) }}>
              <Text size="sm">{variant.name}</Text>
            </Table.Td>
            {channels.map(channel => (
              <Table.Td key={channel.id} style={{ textAlign: 'center' }}>
                {renderPriceInput(variant, channel)}
              </Table.Td>
            ))}
          </Table.Tr>
        ))}
      </>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="批量渠道价格管理"
      size="90%"
      centered
      styles={{
        title: { fontWeight: 700, fontSize: rem(18) },
        body: { padding: 0 },
        content: { maxWidth: '100%' },
      }}
    >
      <LoadingOverlay visible={saving} />
      
      {/* 快捷操作栏 */}
      <Box px="md" py="sm" bg="gray.0" style={{ borderBottom: '1px solid #eee' }}>
        <Flex justify="space-between" align="center">
          <Group gap="sm">
            <Text size="sm" fw={500}>快捷操作：基于小程序价格</Text>
            <Select
              size="xs"
              value={selectedRule}
              onChange={(val) => setSelectedRule(val as PricingRule)}
              data={PRICING_RULES.map(r => ({ value: r.value, label: r.label }))}
              style={{ width: 120 }}
            />
            <Button size="xs" variant="light" onClick={applyRuleToAll}>
              应用到所有
            </Button>
          </Group>
          <Text size="xs" c="dimmed">共 {products.length} 个商品</Text>
        </Flex>
      </Box>

      {/* 表格 */}
      <ScrollArea h={500}>
        <Table verticalSpacing="sm" horizontalSpacing="lg" layout="fixed">
          <Table.Thead bg="#fafafa" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <Table.Tr>
              <Table.Th style={{ width: rem(320) }}>商品</Table.Th>
              {channels.map(channel => (
                <Table.Th key={channel.id} style={{ width: rem(120) }}>
                  <Flex direction="column" align="center" justify="center" gap={4}>
                    {channel.icon && <Image src={channel.icon} w={24} h={24} radius="xs" />}
                    <Text size="xs" fw={500}>{channel.name}</Text>
                  </Flex>
                </Table.Th>
              ))}

            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.map(renderProductRow)}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {/* 底部操作栏 */}
      <Box px="md" py="sm" style={{ borderTop: '1px solid #eee' }}>
        <Group justify="flex-end">
          <Button variant="outline" color="gray" onClick={onClose}>取消</Button>
          <Button color="yellow.6" leftSection={<IconCheck size={16} />} onClick={handleSave} loading={saving}>
            保存
          </Button>
        </Group>
      </Box>
    </Modal>
  );
}
