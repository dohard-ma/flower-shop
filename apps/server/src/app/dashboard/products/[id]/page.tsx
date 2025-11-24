"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/image-upload"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { http } from '@/lib/request'
import { useToast } from '@/hooks/use-toast'

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
  name: string
  description: string
  category: string
  priceRef: string
  status: string
  images: string[]
  videos: string[]
  materials: Array<{
    name: string;
    quantity?: number;
    color?: string;
    description?: string;
  }>
  sortOrder: number
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
}

export default function ProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const isNew = !params.id || params.id === "new"

  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!isNew)

  // 获取产品详情
  const fetchProduct = async (id: string) => {
    setInitialLoading(true)
    try {
      const response = await http.get<{ product: Product }>(`/api/admin/products/${id}`)
      if (response.success) {
        const product = response.data.product
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
        })
      }
    } catch (error: any) {
      toast({
        title: '获取产品详情失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
      router.push('/dashboard/products')
    } finally {
      setInitialLoading(false)
    }
  }

  useEffect(() => {
    if (!isNew && params.id) {
      fetchProduct(params.id as string)
    }
  }, [isNew, params.id])

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleUpdateFile = async (field: keyof ProductFormData, value: (string | File)[]) => {
    if (!value || value.length === 0) {
      setFormData((prev) => ({ ...prev, [field]: [] }))
      return
    }

    // 分离已上传的图片(字符串URL)和新选择的图片(File对象)
    const existingUrls = value.filter((item): item is string => typeof item === 'string')
    const newFiles = value.filter((item): item is File => item instanceof File)

    if (newFiles.length === 0) {
      // 只是重新排序或删除了现有图片
      setFormData((prev) => ({ ...prev, [field]: existingUrls }))
      return
    }

    try {
      // 确定上传类型
      const uploadType = field === 'images' ? 'images' : 'videos'

      // 显示上传进度提示
      toast({
        title: '正在上传',
        description: `正在上传 ${newFiles.length} 张图片...`
      })

      // 上传新图片
      const uploadPromises = newFiles.map(async (file: File) => {
        // 创建FormData
        const formData = new FormData()
        formData.append('file', file)

        // 上传到服务器
        const uploadResponse = await http.post(`/api/admin/upload?type=${uploadType}`, formData)

        if (uploadResponse.success) {
          return uploadResponse.data.url
        } else {
          throw new Error(uploadResponse.message || '上传失败')
        }
      })

      // 等待所有上传完成
      const uploadedUrls = await Promise.all(uploadPromises)

      // 合并已有图片和新上传的图片
      const allUrls = [...existingUrls, ...uploadedUrls]
      setFormData((prev) => ({ ...prev, [field]: allUrls }))

      toast({
        title: '上传成功',
        description: `成功上传 ${uploadedUrls.length} 张图片`
      })

    } catch (error: any) {
      console.error('图片上传失败:', error)
      toast({
        title: '上传失败',
        description: error.message || '图片上传失败，请重试',
        variant: 'destructive'
      })

      // 上传失败时，只保留已有的图片
      setFormData((prev) => ({ ...prev, [field]: existingUrls }))
    }
  }

  const handleSave = async () => {
    // 基本验证
    if (!formData.name.trim()) {
      toast({
        title: '验证失败',
        description: '商品名称不能为空',
        variant: 'destructive'
      })
      return
    }

    if (!formData.priceRef.trim()) {
      toast({
        title: '验证失败',
        description: '参考价格不能为空',
        variant: 'destructive'
      })
      return
    }

    if (!formData.category) {
      toast({
        title: '验证失败',
        description: '请选择商品分类',
        variant: 'destructive'
      })
      return
    }

    // 确保 sortOrder 为数字
    formData.sortOrder = Number(formData.sortOrder || 0)

    // {"productName":"包装袋","detail":"手提袋","productType":3,"price":"1","stock":100,"isActive":true,"coverImages":["http://static.laohuoji.link/products/covers/1748059181867-gcobkt9kksn.webp","http://static.laohuoji.link/products/covers/1748059185753-9qps3ygcos.png","http://static.laohuoji.link/products/covers/1748530276889-wy76z1fvqz.jpg"],"images":["http://static.laohuoji.link/products/images/1748053088678-7acfeoygrie.png","http://static.laohuoji.link/products/images/1748053092515-ngb8ltt5g9.png"],"isSubscription":false,"maxDeliveries":null,"deliveryTypedeliveryType":null,"deliveryInterval":null}

    setLoading(true)
    try {
      if (isNew) {
        // 新建产品
        const response = await http.post('/api/admin/products', formData)
        if (response.success) {
          toast({
            title: '创建成功',
            description: '产品创建成功'
          })
          router.push('/dashboard/products')
        }
      } else {
        // 更新产品
        const response = await http.put(`/api/admin/products?id=${params.id}`, formData)
        if (response.success) {
          toast({
            title: '更新成功',
            description: '产品更新成功'
          })
          router.push('/dashboard/products')
        }
      }
    } catch (error: any) {
      toast({
        title: isNew ? '创建失败' : '更新失败',
        description: error.message || '请稍后重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 获取分类文本
  const getCategoryText = (category: string) => {
    const categoryMap = {
      'BOUQUET': '花束',
      'BASKET': '花篮',
      'POTTED': '盆栽',
      'WREATH': '花环'
    }
    return categoryMap[category as keyof typeof categoryMap] || category
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">加载中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNew ? "新建产品" : "编辑产品"}
            </h1>
            {!isNew && (
              <p className="text-muted-foreground">产品ID: {params.id}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "保存中..." : "保存产品"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">商品名称 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="请输入商品名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">商品分类</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleInputChange("category", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择商品分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BOUQUET">花束</SelectItem>
                      <SelectItem value="BASKET">花篮</SelectItem>
                      <SelectItem value="POTTED">盆栽</SelectItem>
                      <SelectItem value="WREATH">花环</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">商品描述</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="请输入商品描述"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceRef">参考价格 *</Label>
                  <Input
                    id="priceRef"
                    value={formData.priceRef}
                    onChange={(e) => handleInputChange("priceRef", e.target.value)}
                    placeholder="例如: 120-180 或 150"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">排序权重</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) => handleInputChange("sortOrder", Number.parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 商品图片 */}
          <Card>
            <CardHeader>
              <CardTitle>商品图片</CardTitle>
              <p className="text-sm text-muted-foreground">
                上传商品图片，第一张图片将作为主要展示图片。
              </p>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.images}
                onChange={(files) => handleUpdateFile("images", files)}
                maxFiles={10}
                aspectRatio="1/1"
                width={150}
                height={150}
              />
            </CardContent>
          </Card>

          {/* 商品视频 */}
          <Card>
            <CardHeader>
              <CardTitle>商品视频</CardTitle>
              <p className="text-sm text-muted-foreground">
                上传商品视频，用于更好地展示产品。
              </p>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.videos}
                onChange={(files) => handleUpdateFile("videos", files)}
                maxFiles={3}
                aspectRatio="16/9"
                width={200}
                height={112}
                accept="video/*"
              />
            </CardContent>
          </Card>

          {/* 花材管理 */}
          <Card>
            <CardHeader>
              <CardTitle>花材信息</CardTitle>
              <p className="text-sm text-muted-foreground">
                添加商品包含的花材信息。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>花材列表 (JSON格式)</Label>
                <Textarea
                  value={JSON.stringify(formData.materials, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleInputChange("materials", parsed)
                    } catch (error) {
                      // 输入错误时不更新
                    }
                  }}
                  placeholder={`[{"name": "玫瑰", "quantity": 12, "color": "红色", "description": "主花材"}]`}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  格式示例: {`[{"name": "玫瑰", "quantity": 12, "color": "红色", "description": "主花材"}]`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧状态信息 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>产品状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="status">商品状态</Label>
                <Switch
                  id="status"
                  checked={formData.status === 'ACTIVE'}
                  onCheckedChange={(checked) => handleInputChange("status", checked ? 'ACTIVE' : 'INACTIVE')}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>当前状态</Label>
                <Badge variant={formData.status === 'ACTIVE' ? "default" : "secondary"}>
                  {formData.status === 'ACTIVE' ? "已上架" : "已下架"}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>商品分类</Label>
                <Badge variant="outline">
                  {getCategoryText(formData.category)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label>排序权重</Label>
                <Badge variant="secondary">
                  {formData.sortOrder}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 商品预览 */}
          <Card>
            <CardHeader>
              <CardTitle>商品预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>商品名称</Label>
                <p className="text-sm">{formData.name || "未设置"}</p>
              </div>
              <div className="space-y-2">
                <Label>参考价格</Label>
                <p className="text-sm font-medium">{formData.priceRef || "未设置"}</p>
              </div>
              <div className="space-y-2">
                <Label>分类</Label>
                <p className="text-sm">{getCategoryText(formData.category)}</p>
              </div>
              {formData.images.length > 0 && (
                <div className="space-y-2">
                  <Label>主要图片</Label>
                  <img
                    src={formData.images[0]}
                    alt="商品图片"
                    className="w-20 h-20 rounded-md object-cover"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
