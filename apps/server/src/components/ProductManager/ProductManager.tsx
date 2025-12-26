'use client';

import { useState } from 'react';
import { Button, Container, Group, Title, Text, Stack, rem } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';
import { ProductList } from '@/components/ProductList/ProductList';
import { Product } from '@/types/product';

const INITIAL_PRODUCTS: Product[] = [
    {
        id: '1',
        title: '智能手表',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        price: 1299,
        tags: ['电子产品', '穿戴设备'],
    },
    {
        id: '2',
        title: '无线耳机',
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
        price: 799,
        tags: ['电子产品', '音频'],
    },
];

export function ProductManager() {
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

    const handleDelete = (id: string) => {
        setProducts((current) => current.filter((p) => p.id !== id));
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <div>
                        <Title order={2} fw={700}>
                            商品管理
                        </Title>
                        <Text c="dimmed" size="sm" mt={rem(4)}>
                            查看、搜索和编辑您的所有库存商品
                        </Text>
                    </div>
                    <Button
                        component={Link}
                        href="/products/new"
                        leftSection={<IconPlus size={rem(18)} />}
                        radius="md"
                    >
                        新增商品
                    </Button>
                </Group>

                <ProductList products={products} onDelete={handleDelete} />
            </Stack>
        </Container>
    );
}
