'use client';

import { useState } from 'react';
import {
    Button,
    Group,
    NumberInput,
    Stack,
    TagsInput,
    TextInput,
    Paper,
    Title,
    Divider,
    rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { Product } from '@/types/product';

interface ProductFormProps {
    initialValues?: Product;
    onSubmit: (values: Omit<Product, 'id'>) => void;
    onCancel: () => void;
}

const ALL_TAGS = ['电子产品', '穿戴设备', '音频', '家居', '生活用品'];

export function ProductForm({ initialValues, onSubmit, onCancel }: ProductFormProps) {
    const [tagData] = useState(ALL_TAGS);

    const form = useForm({
        initialValues: {
            title: initialValues?.title || '',
            image: initialValues?.image || '',
            price: initialValues?.price || 0,
            tags: initialValues?.tags || [],
        },
        validate: {
            title: (value: string) => (value.length < 2 ? '标题至少需要2个字符' : null),
            image: (value: string) => (value.length < 1 ? '请输入图片链接' : null),
            price: (value: number) => (value <= 0 ? '价格必须大于0' : null),
        },
    });

    const handleSubmit = (values: typeof form.values) => {
        onSubmit(values);
    };

    return (
        <Paper withBorder shadow="sm" radius="md" p="xl" bg="var(--mantine-color-body)">
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap="lg">
                    <div>
                        <Title order={4} mb={rem(4)}>基本信息</Title>
                        <Divider mb="lg" />

                        <Stack gap="md">
                            <TextInput
                                label="商品标题"
                                placeholder="例如：iPhone 15 Pro"
                                required
                                {...form.getInputProps('title')}
                            />
                            <TextInput
                                label="图片链接"
                                placeholder="https://images.unsplash.com/..."
                                required
                                {...form.getInputProps('image')}
                            />
                            <NumberInput
                                label="价格"
                                placeholder="请输入销售价格"
                                required
                                min={0}
                                prefix="¥"
                                thousandSeparator=","
                                {...form.getInputProps('price')}
                            />
                        </Stack>
                    </div>

                    <div>
                        <Title order={4} mb={rem(4)}>分类与标签</Title>
                        <Divider mb="lg" />

                        <TagsInput
                            label="标签"
                            description="输入后按回车新增自定义标签"
                            placeholder="搜索或输入标签"
                            data={tagData}
                            {...form.getInputProps('tags')}
                        />
                    </div>

                    <Group justify="flex-end" mt="xl">
                        <Button variant="subtle" color="gray" onClick={onCancel}>
                            取消
                        </Button>
                        <Button type="submit" px="xl">
                            确认保存
                        </Button>
                    </Group>
                </Stack>
            </form>
        </Paper>
    );
}
