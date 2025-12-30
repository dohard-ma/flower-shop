import { Flex, TextInput, Select, MultiSelect, NumberInput, Text, Group, Button, UnstyledButton, Stack, Box, rem } from '@mantine/core';
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
  
  const ActionButtons = (
    <Group gap="xs" grow={isMobile}>
      {isMobile ? (
         <Flex direction="row" justify="space-between" w="100%" px="xs" py="xs" bg="white">
            <UnstyledButton onClick={onManageCategories}>
                <Stack gap={2} align="center">
                    <IconCategory size={20} stroke={1.5} />
                    <Text size="xs" fw={500}>分类管理</Text>
                </Stack>
            </UnstyledButton>
            <UnstyledButton>
                <Stack gap={2} align="center">
                    <IconArrowsSort size={20} stroke={1.5} />
                    <Text size="xs" fw={500}>商品排序</Text>
                </Stack>
            </UnstyledButton>
            <UnstyledButton>
                <Stack gap={2} align="center">
                    <IconListCheck size={20} stroke={1.5} />
                    <Text size="xs" fw={500}>批量操作</Text>
                </Stack>
            </UnstyledButton>
            <Button
                leftSection={<IconPlus size={18} />}
                radius="xl"
                color="yellow.6"
                size="sm"
                onClick={onNew}
            >
                商品新建
            </Button>
         </Flex>
      ) : (
        <>
            <Button variant="default" leftSection={<IconDownload size={16} />} size="xs" onClick={onDownload}>下载全部商品</Button>
            <Button variant="default" size="xs" onClick={onReset}>重置</Button>
            <Button color="yellow.6" size="xs" onClick={onQuery}>查询</Button>
        </>
      )}
    </Group>
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
        {ActionButtons}
      </Box>
    );
  }

  return (
    <Box p="sm" bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
      <Stack gap="xs">
        <Flex gap="md" align="center">
          <TextInput
            placeholder="请输入商品名称/品牌/条码查找"
            leftSection={<IconSearch size={18} color="#999" />}
            radius="xl"
            style={{ flex: 1 }}
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            styles={{
              input: {
                backgroundColor: '#f5f5f5',
                border: 'none',
                borderRadius: rem(20),
              }
            }}
          />
          {ActionButtons}
        </Flex>
        <Flex gap="md" align="center">
          <Select
            placeholder="库存状态"
            size="xs"
            data={['全部', '售罄', '库存充足']}
            style={{ width: 150 }}
          />
          <Flex align="center" gap={4}>
            <Text size="xs">月售</Text>
            <NumberInput size="xs" placeholder="最小值" style={{ width: 80 }} />
            <Text size="xs">-</Text>
            <NumberInput size="xs" placeholder="最大值" style={{ width: 80 }} />
          </Flex>
          <MultiSelect
            data={channels.map(c => ({ value: c.code, label: c.name }))}
            placeholder="更多渠道"
            size="xs"
            clearable
            value={selectedChannels}
            onChange={onChannelsChange}
            style={{ width: 150 }}
          />
        </Flex>
      </Stack>
    </Box>
  );
}
