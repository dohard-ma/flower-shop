'use client';

import { useState } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Group,
    Image,
    Table,
    Text,
    TextInput,
    ScrollArea,
    rem,
} from '@mantine/core';
import { IconEdit, IconSearch, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { Product } from '@/types/product';

interface ProductListProps {
    products: Product[];
    onDelete: (id: string) => void;
}

export function ProductList({ products, onDelete }: ProductListProps) {
    const [search, setSearch] = useState('');

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.currentTarget;
        setSearch(value);
    };

    const filteredProducts = products.filter((product) =>
        product.title.toLowerCase().includes(search.toLowerCase()) ||
        product.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    );

    const rows = filteredProducts.map((product) => (
        <Table.Tr key={product.id}>
            <Table.Td>
                <Group gap="sm">
                    <Image
                        src={product.image}
                        h={40}
                        w={40}
                        radius="md"
                        fallbackSrc="https://placehold.co/40x40?text=No+Image"
                    />
                    <Text size="sm" fw={500}>
                        {product.title}
                    </Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Text size="sm" fw={500}>
                    ¥{product.price.toLocaleString()}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    {product.tags.map((tag) => (
                        <Badge key={tag} variant="light" size="sm" radius="sm">
                            {tag}
                        </Badge>
                    ))}
                </Group>
            </Table.Td>
            <Table.Td>
                <Group gap="xs" justify="flex-end">
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        component={Link}
                        href={`/products/edit/${product.id}`}
                    >
                        <IconEdit style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        onClick={() => onDelete(product.id)}
                    >
                        <IconTrash style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Box>
            <TextInput
                placeholder="搜索商品名称或标签..."
                mb="md"
                leftSection={<IconSearch style={{ width: rem(16), height: rem(16) }} stroke={1.5} />}
                value={search}
                onChange={handleSearchChange}
            />
            <ScrollArea>
                <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>商品信息</Table.Th>
                            <Table.Th>价格</Table.Th>
                            <Table.Th>标签</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>操作</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.length > 0 ? (
                            rows
                        ) : (
                            <Table.Tr>
                                <Table.Td colSpan={4}>
                                    <Text ta="center" py="xl" c="dimmed">
                                        未找到匹配的商品
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Box>
    );
}
