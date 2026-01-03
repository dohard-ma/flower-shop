import { Flex, TextInput, Select, MultiSelect, NumberInput, Text, Group, Button, UnstyledButton, Stack, Box, rem, Image as MantineImage } from '@mantine/core';
import { IconSearch, IconPlus, IconDownload, IconCategory, IconArrowsSort, IconListCheck } from '@tabler/icons-react';
import { Channel } from '../types';

interface ProductFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  selectedChannels: string[];
  onChannelsChange: (value: string[]) => void;
  channels: Channel[];
  isMobile: boolean;
  onQuery: () => void;
  onReset: () => void;
  onDownload: () => void;
  onNew: () => void;
  onManageCategories: () => void;
}

export function ProductFilterBar({
  search,
  onSearchChange,
  selectedChannels,
  onChannelsChange,
  channels,
  isMobile,
  onQuery,
  onReset,
  onDownload,
  onNew,
  onManageCategories,
}: ProductFilterBarProps) {
  
  const DesktopFilter = (
    <Stack gap="xs" p="md" bg="white">
      <Flex gap="xl" align="flex-end">
        <Box style={{ flex: 1 }}>
          <Text size="xs" fw={500} mb={4} c="gray.7">搜索关键词</Text>
          <TextInput
            placeholder="商品名、SPU、条码"
            leftSection={<IconSearch size={16} color="var(--mantine-color-gray-5)" />}
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            radius="xs"
            styles={{ input: { backgroundColor: '#fff', border: '1px solid #dee2e6' } }}
          />
        </Box>

        <Box style={{ width: 180 }}>
          <Text size="xs" fw={500} mb={4} c="gray.7">库存状态</Text>
          <Select
            placeholder="全部状态"
            data={['全部状态', '已售罄', '有库存']}
            defaultValue="全部状态"
            radius="xs"
          />
        </Box>

        <Box style={{ flex: 2 }}>
          <Text size="xs" fw={500} mb={6} c="gray.7">销售渠道</Text>
          <Group gap={8}>
            {channels.map((channel) => {
              const isSelected = selectedChannels.includes(channel.code);
              return (
                <UnstyledButton
                  key={channel.id}
                  onClick={() => {
                    const newSelected = isSelected
                      ? selectedChannels.filter((c) => c !== channel.code)
                      : [...selectedChannels, channel.code];
                    onChannelsChange(newSelected);
                  }}
                  style={{
                    padding: `${rem(4)} ${rem(10)}`,
                    borderRadius: rem(6),
                    border: `1px solid ${isSelected ? 'var(--mantine-color-yellow-6)' : '#eee'}`,
                    backgroundColor: isSelected ? 'var(--mantine-color-yellow-0)' : '#fff',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: rem(6)
                  }}
                >
                  {channel.icon ? (
                    <MantineImage src={channel.icon} w={16} h={16} radius="xs" alt={channel.name} />
                  ) : (
                    <Box w={16} h={16} bg="gray.1" style={{ borderRadius: 2 }} />
                  )}
                  <Text size="xs" fw={isSelected ? 600 : 400} c={isSelected ? 'yellow.9' : 'gray.7'}>
                    {channel.name}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>
        </Box>

        <Box>
            <Text size="xs" fw={500} mb={4} c="gray.7">价格区间</Text>
            <Flex align="center" gap={8}>
                <NumberInput placeholder="最低价" hideControls radius="xs" style={{ width: 100 }} />
                <Text size="xs" c="dimmed">-</Text>
                <NumberInput placeholder="最高价" hideControls radius="xs" style={{ width: 100 }} />
            </Flex>
        </Box>

        <Group gap="sm" ml="auto">
            <Button variant="subtle" color="gray" leftSection={<IconArrowsSort size={16} />} size="sm">
                更多筛选
            </Button>
            <Button variant="default" onClick={onReset} size="sm" px="xl">重置</Button>
            <Button color="black" onClick={onQuery} size="sm" px="xl">查询</Button>
        </Group>
      </Flex>
    </Stack>
  );

  if (isMobile) {
    return (
      <Box 
        p={0} 
        bg="white" 
        style={{ 
          borderTop: '1px solid #eee', 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          zIndex: 100,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' 
        }}
      >
        <Group gap="xs" grow px="xs" py="xs">
            <UnstyledButton onClick={onManageCategories}>
                <Stack gap={2} align="center">
                    <IconCategory size={20} stroke={1.5} />
                    <Text size="xs" fw={500}>分类</Text>
                </Stack>
            </UnstyledButton>
            <Button
                leftSection={<IconPlus size={18} />}
                radius="xl"
                color="yellow.6"
                size="sm"
                onClick={onNew}
            >
                新建
            </Button>
         </Group>
      </Box>
    );
  }

  return DesktopFilter;
}
