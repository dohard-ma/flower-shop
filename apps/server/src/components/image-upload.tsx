"use client"

import React, { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Upload, X, ZoomIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ImageUploadProps {
  value?: string[]
  onChange?: (files: (string | File)[]) => void
  maxFiles?: number
  accept?: string
  className?: string
  uploadAreaClassName?: string
  previewClassName?: string
  aspectRatio?: string // e.g., "16/9", "1/1", "4/3"
  width?: number
  height?: number
  disabled?: boolean
}

export function ImageUpload({
  value = [],
  onChange,
  maxFiles = 5,
  accept = "image/*",
  className,
  uploadAreaClassName,
  previewClassName,
  aspectRatio = "1/1",
  width = 200,
  height = 200,
  disabled = false,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [internalFiles, setInternalFiles] = useState<(string | File)[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // 同步外部value到内部状态
  React.useEffect(() => {
    setInternalFiles(value.map(url => url)) // 全部作为字符串处理
  }, [value])

  const handleFiles = (files: FileList) => {
    const newFiles = Array.from(files).slice(0, maxFiles - internalFiles.length)
    const updatedFiles = [...internalFiles, ...newFiles]
    setInternalFiles(updatedFiles)
    onChange?.(updatedFiles)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const removeImage = (index: number) => {
    const newFiles = internalFiles.filter((_, i) => i !== index)
    setInternalFiles(newFiles)
    onChange?.(newFiles)
  }

  const onButtonClick = () => {
    inputRef.current?.click()
  }

  const getPreviewUrl = (item: string | File) => {
    if (typeof item === 'string') {
      return item
    }
    return URL.createObjectURL(item)
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 上传区域 */}
      {internalFiles.length < maxFiles && (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
            disabled && "opacity-50 cursor-not-allowed",
            uploadAreaClassName
          )}
          style={{ width, height, aspectRatio }}
        >
          <CardContent
            className="flex flex-col items-center justify-center h-full p-6 cursor-pointer"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={disabled ? undefined : onButtonClick}
          >
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium">点击上传</span> 或拖拽文件到此处
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              还可上传 {maxFiles - internalFiles.length} 个文件
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={accept}
              onChange={handleChange}
              className="hidden"
              disabled={disabled}
            />
          </CardContent>
        </Card>
      )}

      {/* 预览区域 */}
      {internalFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {internalFiles.map((file, index) => (
            <Card key={index} className={cn("relative group", previewClassName)}>
              <CardContent className="p-2">
                <div
                  className="relative overflow-hidden rounded-md"
                  style={{ aspectRatio }}
                >
                  <img
                    src={getPreviewUrl(file)}
                    alt={`预览 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* 悬浮操作按钮 */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary" className="h-8 w-8 p-0">
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>图片预览</DialogTitle>
                        </DialogHeader>
                        <div className="flex items-center justify-center">
                          <img
                            src={getPreviewUrl(file)}
                            alt={`完整预览 ${index + 1}`}
                            className="max-w-full max-h-[70vh] object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 w-8 p-0"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
