import { Table, Box, Text } from '@mantine/core';
import { ProductVariant } from '../types';

interface VariantsPopoverProps {
  variants: ProductVariant[];
}

export function VariantsPopover({ variants }: VariantsPopoverProps) {
  return (
    <Box p="xs">
      <Table variant="unstyled" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th><Text size="xs" c="dimmed">规格</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">价格</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">库存</Text></Table.Th>
            <Table.Th><Text size="xs" c="dimmed">店内码</Text></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {variants.map((v) => (
            <Table.Tr key={v.id}>
              <Table.Td><Text size="xs" fw={500}>{v.name}</Text></Table.Td>
              <Table.Td><Text size="xs" c="red.7">¥{v.price}</Text></Table.Td>
              <Table.Td><Text size="xs">{v.stock}</Text></Table.Td>
              <Table.Td><Text size="xs" c="dimmed">{v.storeCode || '-'}</Text></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
