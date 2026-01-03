'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Group,
  Button,
  TextInput,
  Textarea,
  Stack,
  Card,
  Select,
  Switch,
  NumberInput,
  rem,
  Divider,
  ActionIcon,
  Breadcrumbs,
  Anchor,
  LoadingOverlay,
  Box,
  MultiSelect,
  Table,
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconX } from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';
import { ImageUpload } from '@/components/image-upload';

// 产品类型定义
export interface StoreCategory {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  images: string[];
  videos?: string[];
  materials: any;
  status: string;
  description?: string | null;
  mainFlower?: string | null;
  colorSeries?: string | null;
  sortOrder: number;
  categories: { category: StoreCategory }[];
  styleId?: string | null;
  variants?: any[];
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  description: string;
  categoryIds: string[];
  status: string;
  images: string[];
  videos: string[];
  materials: any;
  styleId: string | null;
  sortOrder: number;
  mainFlower: string;
  colorSeries: string;
  variants: any[];
}

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  categoryIds: [],
  status: "ACTIVE",
  images: [],
  videos: [],
  materials: [],
  styleId: null,
  sortOrder: 0,
  mainFlower: "",
  colorSeries: "",
  variants: [],
};

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = !params.id || params.id === "new";

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [availableCategories, setAvailableCategories] = useState<{ value: string; label: string }[]>([]);
  const [availableStyles, setAvailableStyles] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await http.get<StoreCategory[]>('/api/admin/categories');
      if (res.success && Array.isArray(res.data)) {
        setAvailableCategories(res.data.map(cat => ({
          value: cat.id,
          label: cat.name
        })));
      }
    } catch (e) {
      console.error('Failed to fetch categories');
    }
  }, []);

  const fetchStyles = useCallback(async () => {
    try {
      const res = await http.get<any[]>('/api/admin/products/styles');
      if (res.success && Array.isArray(res.data)) {
        setAvailableStyles(res.data.map(s => ({
          value: s.id,
          label: s.name
        })));
      }
    } catch (e) {
      console.error('Failed to fetch styles');
    }
  }, []);

  const fetchProduct = useCallback(async (id: string) => {
    setInitialLoading(true);
    try {
      const response = await http.get<{ product: Product }>(`/api/admin/products/${id}`);
      if (response && response.data) {
        const product = response.data.product;
        setFormData({
          name: product.name,
          description: product.description || "",
          categoryIds: product.categories?.map(c => c.category.id) || [],
          status: product.status,
          images: product.images || [],
          videos: product.videos || [],
          materials: product.materials || [],
          mainFlower: product.mainFlower || "",
          colorSeries: product.colorSeries || "",
          styleId: product.styleId || null,
          sortOrder: product.sortOrder,
          variants: product.variants || [],
        });
      }
    } catch (error: any) {
      notifications.show({
        title: '获取失败',
        message: error.message || '获取产品详情失败',
        color: 'red',
      });
      router.push('/dashboard/products');
    } finally {
      setInitialLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCategories(), fetchStyles()]);
      if (!isNew && params.id) {
        await fetchProduct(params.id as string);
      } else {
        setInitialLoading(false);
      }
    };
    init();
  }, [isNew, params.id, fetchCategories, fetchStyles, fetchProduct]);

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleUpdateImages = async (value: (string | File)[]) => {
    const existingUrls = value.filter((item): item is string => typeof item === 'string');
    const newFiles = value.filter((item): item is File => item instanceof File);

    if (newFiles.length === 0) {
      setFormData((prev) => ({ ...prev, images: existingUrls }));
      return;
    }

    try {
      notifications.show({
        id: 'uploading',
        title: '正在上传',
        message: `正在上传 ${newFiles.length} 张图片...`,
        loading: true,
        autoClose: false,
      });

      const uploadPromises = newFiles.map(async (file: File) => {
        const data = new FormData();
        data.append('file', file);
        const res = await http.post(`/api/admin/upload?type=images`, data);
        if (res.success) return res.data.url;
        throw new Error(res.message || '上传失败');
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const allUrls = [...existingUrls, ...uploadedUrls];
      setFormData((prev) => ({ ...prev, images: allUrls }));

      notifications.update({
        id: 'uploading',
        title: '上传成功',
        message: `成功上传 ${uploadedUrls.length} 张图片`,
        color: 'green',
        loading: false,
        autoClose: 2000,
      });
    } catch (error: any) {
      notifications.update({
        id: 'uploading',
        title: '上传失败',
        message: error.message || '上传失败',
        color: 'red',
        loading: false,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      notifications.show({ title: '验证失败', message: '商品名称不能为空', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (isNew) {
        response = await http.post('/api/admin/products', formData);
      } else {
        response = await http.put(`/api/admin/products?id=${params.id}`, formData);
      }

      if (response.success) {
        notifications.show({
          title: '保存成功',
          message: isNew ? '商品已成功创建' : '商品已成功更新',
          color: 'green',
        });
        router.push('/dashboard/products');
      }
    } catch (error: any) {
      notifications.show({
        title: '保存失败',
        message: error.message || '保存失败，请稍后重试',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor href="/dashboard">首页</Anchor>
          <Anchor href="/dashboard/products">商品管理</Anchor>
          <Text>{isNew ? '新增商品' : '编辑商品'}</Text>
        </Breadcrumbs>

        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => router.back()}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={2}>{isNew ? '新增商品' : '编辑商品'}</Title>
          </Group>
          <Button leftSection={<IconDeviceFloppy size={18} />} onClick={handleSave} loading={loading}>
            保存
          </Button>
        </Group>

        <Box pos="relative">
          <LoadingOverlay visible={initialLoading} />
          <Card withBorder radius="md" p="xl">
            <Stack gap="xl">
              <section>
                <Title order={4} mb="md">基本信息</Title>
                <Divider mb="lg" />
                <Stack gap="md">
                  <TextInput
                    label="商品名称"
                    placeholder="请输入商品名称"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.currentTarget.value)}
                  />
                  <Group grow align="flex-start">
                    <Select
                      label="款式"
                      placeholder="请选择物理款式"
                      data={availableStyles}
                      value={formData.styleId}
                      onChange={(val) => handleInputChange('styleId', val)}
                      clearable
                    />
                    <TextInput
                      label="主花材"
                      placeholder="例如：碎冰蓝玫瑰"
                      value={formData.mainFlower}
                      onChange={(e) => handleInputChange('mainFlower', e.currentTarget.value)}
                    />
                    <TextInput
                      label="色系"
                      placeholder="例如：蓝色"
                      value={formData.colorSeries}
                      onChange={(e) => handleInputChange('colorSeries', e.currentTarget.value)}
                    />
                  </Group>
                  <MultiSelect
                    label="列表展示分类"
                    placeholder="请选择分类 (支持多选)"
                    data={availableCategories}
                    value={formData.categoryIds}
                    onChange={(val) => handleInputChange('categoryIds', val)}
                    searchable
                    clearable
                    required
                  />
                  <Textarea
                    label="描述"
                    placeholder="请输入商品详情介绍"
                    minRows={3}
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.currentTarget.value)}
                  />
                </Stack>
              </section>

              <section>
                <Title order={4} mb="md">商品图片</Title>
                <Divider mb="lg" />
                <ImageUpload
                  value={formData.images}
                  onChange={handleUpdateImages}
                  maxFiles={9}
                />
              </section>

              <section>
                <Group justify="space-between" mb="md">
                  <Title order={4}>规格信息 (SKU)</Title>
                  <Button size="xs" variant="light" onClick={() => {
                    const nextSortOrder = formData.variants.length > 0
                      ? Math.max(...formData.variants.map(v => v.sortOrder || 0)) + 1
                      : 0;
                    setFormData(prev => ({
                      ...prev,
                      variants: [...prev.variants, {
                        name: "",
                        price: 0,
                        costPrice: 0,
                        stock: 99,
                        storeCode: "",
                        sortOrder: nextSortOrder,
                        isActive: true
                      }]
                    }));
                  }}>新增规格</Button>
                </Group>
                <Divider mb="lg" />
                <Box style={{ overflowX: 'auto' }}>
                  <Table withTableBorder withColumnBorders>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: rem(150) }}>规格名称</Table.Th>
                        <Table.Th style={{ width: rem(100) }}>零售价</Table.Th>
                        <Table.Th style={{ width: rem(100) }}>成本价</Table.Th>
                        <Table.Th style={{ width: rem(100) }}>库存</Table.Th>
                        <Table.Th>店内码/条码</Table.Th>
                        <Table.Th style={{ width: rem(80) }}>操作</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {formData.variants.map((variant, index) => (
                        <Table.Tr key={index}>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              placeholder="如：19枝/21枝"
                              value={variant.name}
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].name = e.currentTarget.value;
                                handleInputChange('variants', newVariants);
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              placeholder="0.00"
                              hideControls
                              decimalScale={2}
                              value={variant.price}
                              onChange={(val) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].price = val;
                                handleInputChange('variants', newVariants);
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              placeholder="0.00"
                              hideControls
                              decimalScale={2}
                              value={variant.costPrice}
                              onChange={(val) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].costPrice = val;
                                handleInputChange('variants', newVariants);
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              placeholder="99"
                              value={variant.stock}
                              onChange={(val) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].stock = val;
                                handleInputChange('variants', newVariants);
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <TextInput
                              size="xs"
                              placeholder="扫码或输入"
                              value={variant.storeCode}
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].storeCode = e.currentTarget.value;
                                handleInputChange('variants', newVariants);
                              }}
                            />
                          </Table.Td>
                          <Table.Td>
                            <ActionIcon color="red" variant="subtle" onClick={() => {
                              const newVariants = formData.variants.filter((_, i) => i !== index);
                              handleInputChange('variants', newVariants);
                            }}>
                              <IconX size={16} />
                            </ActionIcon>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  {formData.variants.length === 0 && (
                    <Text ta="center" size="sm" c="dimmed" py="xl" fs="italic">
                      暂无规格信息，点击上方按钮添加
                    </Text>
                  )}
                </Box>
              </section>

              <section>
                <Title order={4} mb="md">设置</Title>
                <Divider mb="lg" />
                <Group grow align="flex-start">
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>上架状态</Text>
                    <Switch
                      checked={formData.status === 'ACTIVE'}
                      onChange={(e) => handleInputChange('status', e.currentTarget.checked ? 'ACTIVE' : 'INACTIVE')}
                      label={formData.status === 'ACTIVE' ? '已上架' : '已下架'}
                    />
                  </Stack>
                  <NumberInput
                    label="排序"
                    description="数值越小越靠前"
                    value={formData.sortOrder}
                    onChange={(val) => handleInputChange('sortOrder', val)}
                  />
                </Group>
              </section>
            </Stack>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}
