import { Box, Tabs, rem, Text } from '@mantine/core';
import { ProductStatus } from '../types';

interface StatusTabsProps {
  activeTab: ProductStatus;
  setActiveTab: (status: ProductStatus) => void;
  total: number;
}

export function StatusTabs({ activeTab, setActiveTab, total }: StatusTabsProps) {
  return (
    <Box bg="white" style={{ borderBottom: '1px solid #f0f0f0' }}>
      <Tabs 
        value={activeTab} 
        onChange={(val) => setActiveTab(val as ProductStatus)} 
        styles={{
          tab: {
            fontWeight: 500,
            fontSize: rem(14),
            paddingTop: rem(14),
            paddingBottom: rem(14),
            color: 'var(--mantine-color-gray-7)',
            '&[data-active]': {
              color: 'var(--mantine-color-black)',
              borderBottomColor: 'var(--mantine-color-yellow-6)',
              borderBottomWidth: rem(3),
            },
            '&:hover': {
              backgroundColor: 'transparent',
              color: 'var(--mantine-color-black)',
            }
          },
          list: {
            borderBottom: 'none'
          }
        }}
      >
        <Tabs.List px="md">
          <Tabs.Tab value="ALL">
             全部商品 <Text component="span" size="xs" c="dimmed" ml={6} fw={400} bg="gray.1" px={6} style={{ borderRadius: 10 }}>{total}</Text>
          </Tabs.Tab>
          <Tabs.Tab value="ACTIVE">
             出售中 <Text component="span" size="xs" c="dimmed" ml={6} fw={400}>0</Text>
          </Tabs.Tab>
          <Tabs.Tab value="SOLD_OUT">
             已售罄 <Text component="span" size="xs" c="dimmed" ml={6} fw={400}>0</Text>
          </Tabs.Tab>
          <Tabs.Tab value="INACTIVE">
             已下架 <Text component="span" size="xs" c="dimmed" ml={6} fw={400}>0</Text>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Box>
  );
}
