# Financial Dashboard - Functiona

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/dohards-projects/v0-financial-dashboard-functiona)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/bgOJg8GHuWc)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/dohards-projects/v0-financial-dashboard-functiona](https://vercel.com/dohards-projects/v0-financial-dashboard-functiona)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/bgOJg8GHuWc](https://v0.dev/chat/projects/bgOJg8GHuWc)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

# 产品管理系统重构说明

## 重构内容

基于现有的 shadcn/ui 设计系统，重构了产品管理功能：

### 1. 产品列表页面 (`/dashboard/products`)

- 使用现代化的表格设计
- 支持筛选、搜索、排序、分页
- 批量操作（删除）
- 通过按钮跳转到详情页面进行新增/编辑

### 2. 产品详情页面 (`/dashboard/products/[id]`)

- 支持新增产品（`/dashboard/products/new`）
- 支持编辑现有产品（`/dashboard/products/{id}`）
- 完整的产品信息表单
- 图片上传功能
- 订阅商品配置
- 实时预览

### 3. API 集成

- 通过 `src/lib/request.ts` 统一的请求方法
- 调用 `src/app/api/admin/products/` 相关路由
- 支持 GET、POST、PUT、DELETE 操作

### 4. 数据结构

产品支持以下字段：

- `productName`: 产品名称
- `productType`: 产品类型（1-年卡，2-礼盒，3-周边）
- `price`: 价格
- `stock`: 库存
- `coverImages`: 封面图片数组
- `detail`: 产品详情
- `images`: 详情图片数组
- `isSubscription`: 是否订阅商品
- `maxDeliveries`: 最大发货次数（订阅商品）
- `deliveryType`: 交付类型（once/interval/solar_term）
- `deliveryInterval`: 交付间隔天数
- `isActive`: 是否上架

### 5. 用户流程

1. 访问产品列表页面查看所有产品
2. 使用筛选和搜索功能快速找到目标产品
3. 点击"新建产品"按钮创建新产品
4. 点击操作菜单中的"编辑"按钮修改现有产品
5. 点击"查看详情"查看产品完整信息
6. 使用批量删除功能管理多个产品

所有操作都通过统一的 API 进行，确保数据一致性和用户体验的统一性。
