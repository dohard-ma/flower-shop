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
  
  const DesktopFilter = (
    <Stack gap="xs" p="md" bg="white">
      <Flex gap="xl" align="flex-end">
        <Box style={{ flex: 1 }}>
          <Text size="xs" fw={500} mb={4} c="gray.7">Search Keyword</Text>
          <TextInput
            placeholder="Name, SPU, Barcode"
            leftSection={<IconSearch size={16} color="var(--mantine-color-gray-5)" />}
            value={search}
            onChange={(e) => onSearchChange(e.currentTarget.value)}
            radius="xs"
            styles={{ input: { backgroundColor: '#fff', border: '1px solid #dee2e6' } }}
          />
        </Box>

        <Box style={{ width: 180 }}>
          <Text size="xs" fw={500} mb={4} c="gray.7">Inventory Status</Text>
          <Select
            placeholder="All Status"
            data={['All Status', 'Sold Out', 'In Stock']}
            defaultValue="All Status"
            radius="xs"
          />
        </Box>

        <Box style={{ width: 200 }}>
          <Text size="xs" fw={500} mb={4} c="gray.7">Sales Channels</Text>
          <MultiSelect
            data={channels.map(c => ({ value: c.code, label: c.name }))}
            placeholder="Select Channels"
            value={selectedChannels}
            onChange={onChannelsChange}
            radius="xs"
            clearable
            styles={{
              input: { 
                maxHeight: rem(36), 
                overflow: 'hidden', 
                flexWrap: 'nowrap',
                display: 'flex',
                alignItems: 'center'
              },
              pill: { margin: '0 2px' },
              inputField: { display: 'none' } // Hide input field when not searching to save space
            }}
          />
        </Box>

        <Box>
            <Text size="xs" fw={500} mb={4} c="gray.7">Price Range</Text>
            <Flex align="center" gap={8}>
                <NumberInput placeholder="Min" hideControls radius="xs" style={{ width: 100 }} />
                <Text size="xs" c="dimmed">-</Text>
                <NumberInput placeholder="Max" hideControls radius="xs" style={{ width: 100 }} />
            </Flex>
        </Box>

        <Group gap="sm" ml="auto">
            <Button variant="subtle" color="gray" leftSection={<IconArrowsSort size={16} />} size="sm">
                More Filters
            </Button>
            <Button variant="default" onClick={onReset} size="sm" px="xl">Reset</Button>
            <Button color="black" onClick={onQuery} size="sm" px="xl">Query</Button>
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
