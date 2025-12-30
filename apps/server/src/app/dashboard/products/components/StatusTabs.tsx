import { Box, Tabs, rem } from '@mantine/core';
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
            paddingTop: rem(12),
            paddingBottom: rem(12),
            '&[data-active]': {
              color: '#fab005',
              borderBottomColor: '#fab005',
            }
          }
        }}
      >
        <Tabs.List px="xs">
          <Tabs.Tab value="ALL">全部 {total || ''}</Tabs.Tab>
          <Tabs.Tab value="ACTIVE">售卖中</Tabs.Tab>
          <Tabs.Tab value="SOLD_OUT">已售罄</Tabs.Tab>
          <Tabs.Tab value="INACTIVE">已下架</Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </Box>
  );
}
