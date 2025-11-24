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
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import { toast } from "sonner"

interface SKUVariant {
  id: string
  name: string
  value: string
  price: number
  stock: number
  sku: string
}

interface ProductFormData {
  name: string
  description: string
  category: string
  brand: string
  price: number
  stock: number
  isActive: boolean
  status: string
  coverImages: string[]
  detailImages: string[]
  skuVariants: SKUVariant[]
}

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  category: "",
  brand: "",
  price: 0,
  stock: 0,
  isActive: true,
  status: "Draft",
  coverImages: [],
  detailImages: [],
  skuVariants: [],
}

export default function ProductEditPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = !params.id || params.id === "new"

  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isNew) {
      // 模拟加载现有产品数据
      setFormData({
        name: "Sample Product",
        description: "This is a sample product description that can be quite long and detailed.",
        category: "Electronics",
        brand: "Apple",
        price: 999.99,
        stock: 50,
        isActive: true,
        status: "Active",
        coverImages: [
          "/placeholder.svg?height=300&width=300",
          "/placeholder.svg?height=300&width=300",
        ],
        detailImages: [
          "/placeholder.svg?height=400&width=600",
          "/placeholder.svg?height=400&width=600",
          "/placeholder.svg?height=400&width=600",
        ],
        skuVariants: [
          {
            id: "1",
            name: "Color",
            value: "Black",
            price: 999.99,
            stock: 25,
            sku: "SKU-001-BLK",
          },
          {
            id: "2",
            name: "Color",
            value: "White",
            price: 999.99,
            stock: 25,
            sku: "SKU-001-WHT",
          },
        ],
      })
    }
  }, [isNew])

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSKUChange = (index: number, field: keyof SKUVariant, value: any) => {
    const newVariants = [...formData.skuVariants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setFormData((prev) => ({ ...prev, skuVariants: newVariants }))
  }

  const addSKUVariant = () => {
    const newVariant: SKUVariant = {
      id: Date.now().toString(),
      name: "",
      value: "",
      price: formData.price,
      stock: 0,
      sku: "",
    }
    setFormData((prev) => ({
      ...prev,
      skuVariants: [...prev.skuVariants, newVariant],
    }))
  }

  const removeSKUVariant = (index: number) => {
    const newVariants = formData.skuVariants.filter((_, i) => i !== index)
    setFormData((prev) => ({ ...prev, skuVariants: newVariants }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // 模拟保存操作
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success(isNew ? "Product created successfully!" : "Product updated successfully!")
      router.push("/products")
    } catch (error) {
      toast.error("Failed to save product")
    } finally {
      setLoading(false)
    }
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
              {isNew ? "Add New Product" : "Edit Product"}
            </h1>
            {!isNew && (
              <p className="text-muted-foreground">Product ID: {params.id}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主要信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand</Label>
                  <Select value={formData.brand} onValueChange={(value) => handleInputChange("brand", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Apple">Apple</SelectItem>
                      <SelectItem value="Samsung">Samsung</SelectItem>
                      <SelectItem value="Nike">Nike</SelectItem>
                      <SelectItem value="Adidas">Adidas</SelectItem>
                      <SelectItem value="Sony">Sony</SelectItem>
                      <SelectItem value="LG">LG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Clothing">Clothing</SelectItem>
                      <SelectItem value="Books">Books</SelectItem>
                      <SelectItem value="Home & Garden">Home & Garden</SelectItem>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="Beauty">Beauty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleInputChange("stock", Number.parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 封面图片 */}
          <Card>
            <CardHeader>
              <CardTitle>Cover Images</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload up to 5 cover images. First image will be the main cover.
              </p>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.coverImages}
                onChange={(files) => handleInputChange("coverImages", files)}
                maxFiles={5}
                aspectRatio="1/1"
                width={150}
                height={150}
              />
            </CardContent>
          </Card>

          {/* 详情图片 */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Images</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload detailed product images for the product description.
              </p>
            </CardHeader>
            <CardContent>
              <ImageUpload
                value={formData.detailImages}
                onChange={(files) => handleInputChange("detailImages", files)}
                maxFiles={10}
                aspectRatio="3/2"
                width={200}
                height={133}
              />
            </CardContent>
          </Card>

          {/* SKU 配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                SKU Variants
                <Button size="sm" onClick={addSKUVariant}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variant
                </Button>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure different variants of this product (e.g., colors, sizes).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.skuVariants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No variants configured. Click "Add Variant" to create one.
                </div>
              ) : (
                formData.skuVariants.map((variant, index) => (
                  <Card key={variant.id} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="outline">Variant {index + 1}</Badge>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeSKUVariant(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="space-y-2">
                        <Label>Attribute Name</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => handleSKUChange(index, "name", e.target.value)}
                          placeholder="e.g., Color, Size"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Attribute Value</Label>
                        <Input
                          value={variant.value}
                          onChange={(e) => handleSKUChange(index, "value", e.target.value)}
                          placeholder="e.g., Red, Large"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Price ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) => handleSKUChange(index, "price", Number.parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => handleSKUChange(index, "stock", Number.parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU Code</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => handleSKUChange(index, "sku", e.target.value)}
                          placeholder="SKU-001"
                        />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右侧状态信息 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 产品统计 */}
          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle>Product Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Views</span>
                  <span className="font-medium">1,234</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Sales</span>
                  <span className="font-medium">89</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="font-medium">$8,899.11</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="font-medium">2 hours ago</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
