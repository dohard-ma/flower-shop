'use client';

import { useState, useEffect } from 'react';
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
} from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import { http } from '@/lib/request';
import { notifications } from '@mantine/notifications';
import { ImageUpload } from '@/components/image-upload';

// 产品类型定义
export interface Product {
  id: string;
  name: string;
  category: string;
  images: string[];
  videos?: string[];
  priceRef: string;
  materials: Array<{
    name: string;
    quantity?: number;
    color?: string;
    description?: string;
  }>;
  status: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  priceRef: string;
  status: string;
  images: string[];
  videos: string[];
  materials: Array<{
    name: string;
    quantity?: number;
    color?: string;
    description?: string;
  }>;
  sortOrder: number;
}

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  category: "BOUQUET",
  priceRef: "",
  status: "ACTIVE",
  images: [],
  videos: [],
  materials: [],
  sortOrder: 0,
};

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = !params.id || params.id === "new";

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!isNew);

  const fetchProduct = async (id: string) => {
    setInitialLoading(true);
    try {
      const response = await http.get<{ product: Product }>(`/api/admin/products/${id}`);
      if (response && response.data) {
        const product = response.data.product;
        setFormData({
          name: product.name,
          description: product.description || "",
          category: product.category,
          priceRef: product.priceRef,
          status: product.status,
          images: product.images || [],
          videos: product.videos || [],
          materials: product.materials || [],
          sortOrder: product.sortOrder,
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
  };

  useEffect(() => {
    if (!isNew && params.id) {
      fetchProduct(params.id as string);
    }
  }, [isNew, params.id]);

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
                  <Group grow>
                    <Select
                      label="分类"
                      data={[
                        { value: 'BOUQUET', label: '花束' },
                        { value: 'BASKET', label: '花篮' },
                        { value: 'BOX', label: '花盒' },
                        { value: 'POTTED', label: '盆栽' },
                      ]}
                      value={formData.category}
                      onChange={(val) => handleInputChange('category', val)}
                    />
                    <TextInput
                      label="价格"
                      placeholder="例如：¥299 或 见详情"
                      required
                      value={formData.priceRef}
                      onChange={(e) => handleInputChange('priceRef', e.currentTarget.value)}
                    />
                  </Group>
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
