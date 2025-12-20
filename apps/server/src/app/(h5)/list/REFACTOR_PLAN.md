# 页面重构计划

## 当前问题总结

- **1141行巨石组件**，违反单一职责原则
- **16+个useState**，状态管理失控
- **10+个useEffect**，副作用地狱
- **代码重复严重**，筛选器逻辑复制粘贴
- **职责混乱**，UI/数据/逻辑全部耦合
- **零可测试性**，无法进行单元测试
- **性能隐患**，无memoization优化

---

## 重构方案

### 1. 组件拆分（关注点分离）

```
page.tsx (100行)
├── components/
│   ├── ProductGrid.tsx          # 产品网格展示
│   ├── ProductCard.tsx          # 单个产品卡片
│   ├── ProductPreview.tsx       # 全屏预览
│   ├── FilterBar.tsx            # 筛选栏容器
│   │   ├── FilterDropdown.tsx   # 通用下拉筛选器
│   │   ├── StyleFilter.tsx      # 款式筛选
│   │   ├── ColorFilter.tsx      # 色系筛选
│   │   └── LikedFilter.tsx      # 我喜欢筛选
│   ├── ShareImageModal.tsx      # 分享图片模态框
│   └── EmptyState.tsx           # 空状态
├── hooks/
│   ├── useProducts.ts           # 产品数据管理
│   ├── useProductFilter.ts      # 筛选逻辑
│   ├── useInfiniteScroll.ts     # 无限滚动
│   ├── useLikedProducts.ts      # 喜欢列表管理
│   ├── useSharedProducts.ts     # 分享模式管理
│   └── useShareImage.ts         # 分享图片生成
├── services/
│   └── productService.ts        # API调用封装
├── types/
│   └── product.ts               # 类型定义
└── utils/
    └── imageProcessor.ts        # 图片处理工具
```

### 2. 状态管理优化

**方案A：使用 Zustand（推荐）**

```typescript
// stores/productStore.ts
interface ProductStore {
  // 数据状态
  products: Product[];
  loading: boolean;
  error: string | null;

  // 筛选状态
  filters: {
    style: string;
    color: string;
    showLiked: boolean;
    showShared: boolean;
  };

  // 分页状态
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };

  // Actions
  fetchProducts: () => Promise<void>;
  setFilter: (key: string, value: any) => void;
  resetFilters: () => void;
}
```

**方案B：使用 useReducer + Context**

```typescript
// 定义状态机模式
type ViewMode = 'all' | 'liked' | 'shared';

interface State {
  mode: ViewMode;
  products: Product[];
  filters: FilterState;
  ui: UIState;
}

type Action =
  | { type: 'SWITCH_MODE'; payload: ViewMode }
  | { type: 'SET_FILTER'; payload: Partial<FilterState> }
  | { type: 'LOAD_SUCCESS'; payload: Product[] }
  // ...
```

### 3. 自定义Hooks设计

#### useProducts Hook

```typescript
interface UseProductsOptions {
  mode: 'all' | 'liked' | 'shared';
  filters: FilterState;
  sharedIds?: string[];
}

function useProducts(options: UseProductsOptions) {
  const [state, setState] = useState<{
    data: Product[];
    loading: boolean;
    error: Error | null;
  }>({ data: [], loading: false, error: null });

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasMore: true
  });

  const fetchProducts = useCallback(async (page: number) => {
    // 统一的数据获取逻辑
  }, [options]);

  return {
    products: state.data,
    loading: state.loading,
    error: state.error,
    pagination,
    fetchMore: () => fetchProducts(pagination.page + 1),
    refetch: () => fetchProducts(1)
  };
}
```

#### useProductFilter Hook

```typescript
function useProductFilter(products: Product[]) {
  const [filters, setFilters] = useState<FilterState>({
    style: '',
    color: '',
    search: ''
  });

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      if (filters.style && product.style !== filters.style) return false;
      if (filters.color && product.colorSeries !== filters.color) return false;
      if (filters.search && !product.name.includes(filters.search)) return false;
      return true;
    });
  }, [products, filters]);

  return {
    filters,
    setFilter: (key: keyof FilterState, value: string) =>
      setFilters(prev => ({ ...prev, [key]: value })),
    clearFilters: () => setFilters({ style: '', color: '', search: '' }),
    filteredProducts
  };
}
```

#### useLikedProducts Hook

```typescript
function useLikedProducts() {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 从localStorage加载
    const saved = localStorage.getItem('likedProducts');
    if (saved) {
      setLikedIds(new Set(JSON.parse(saved)));
    }
  }, []);

  const toggleLike = useCallback((id: string) => {
    setLikedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('likedProducts', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setLikedIds(new Set());
    localStorage.removeItem('likedProducts');
  }, []);

  return {
    likedIds,
    isLiked: (id: string) => likedIds.has(id),
    toggleLike,
    clearAll,
    count: likedIds.size
  };
}
```

### 4. 服务层封装

```typescript
// services/productService.ts
export class ProductService {
  private baseUrl = '/api/public/products';

  async fetchProducts(params: {
    page?: number;
    limit?: number;
    style?: string;
    colorSeries?: string;
    search?: string;
  }): Promise<ApiResponse> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.append(key, String(value));
    });

    const response = await fetch(`${this.baseUrl}?${query}`);
    return response.json();
  }

  async fetchByIds(ids: string[]): Promise<ApiResponse> {
    const response = await fetch(`${this.baseUrl}?ids=${ids.join(',')}`);
    return response.json();
  }
}

export const productService = new ProductService();
```

### 5. 通用筛选器组件

```typescript
// components/FilterDropdown.tsx
interface FilterDropdownProps<T> {
  label: string;
  options: T[];
  value: T | '';
  onChange: (value: T | '') => void;
  renderOption?: (option: T) => React.ReactNode;
}

function FilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  renderOption = (opt) => opt
}: FilterDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`filter-button ${value ? 'bg-pink-100' : 'bg-gray-100'}`}
      >
        {label}
        <ChevronDown className={isOpen ? 'rotate-180' : ''} />
      </button>

      {isOpen && (
        <DropdownMenu>
          <DropdownItem
            active={!value}
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
          >
            全部
          </DropdownItem>
          {options.map(option => (
            <DropdownItem
              key={option}
              active={value === option}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {renderOption(option)}
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </div>
  );
}

// 使用
<FilterDropdown
  label="款式"
  options={STYLE_OPTIONS}
  value={filters.style}
  onChange={(style) => setFilter('style', style)}
/>
```

### 6. 性能优化

```typescript
// 1. 使用 useMemo 缓存计算结果
const filteredProducts = useMemo(() => {
  return products.filter(applyFilters);
}, [products, filters]);

// 2. 使用 useCallback 优化回调
const handleToggleLike = useCallback((id: string) => {
  toggleLike(id);
}, [toggleLike]);

// 3. 虚拟滚动（react-window）
import { FixedSizeGrid } from 'react-window';

<FixedSizeGrid
  columnCount={2}
  columnWidth={180}
  height={800}
  rowCount={Math.ceil(products.length / 2)}
  rowHeight={250}
  width={360}
>
  {ProductCell}
</FixedSizeGrid>

// 4. 图片懒加载
<Image
  src={imageUrl}
  loading="lazy"
  placeholder="blur"
/>
```

### 7. 可测试性改进

```typescript
// hooks/__tests__/useProductFilter.test.ts
describe('useProductFilter', () => {
  it('should filter by style', () => {
    const { result } = renderHook(() =>
      useProductFilter(mockProducts)
    );

    act(() => {
      result.current.setFilter('style', '花束');
    });

    expect(result.current.filteredProducts).toHaveLength(5);
  });
});

// services/__tests__/productService.test.ts
describe('ProductService', () => {
  it('should fetch products with filters', async () => {
    const products = await productService.fetchProducts({
      style: '花束',
      page: 1
    });

    expect(products.success).toBe(true);
    expect(products.data.data).toBeDefined();
  });
});
```

### 8. 设计模式应用

#### Strategy Pattern（策略模式）- 数据获取策略

```typescript
interface FetchStrategy {
  fetch(params: any): Promise<Product[]>;
}

class AllProductsStrategy implements FetchStrategy {
  async fetch(params: FilterParams) {
    return productService.fetchProducts(params);
  }
}

class LikedProductsStrategy implements FetchStrategy {
  constructor(private likedIds: Set<string>) {}

  async fetch(params: FilterParams) {
    const all = await productService.fetchProducts(params);
    return all.filter(p => this.likedIds.has(p.id));
  }
}

class SharedProductsStrategy implements FetchStrategy {
  constructor(private sharedIds: string[]) {}

  async fetch() {
    return productService.fetchByIds(this.sharedIds);
  }
}
```

#### Observer Pattern（观察者模式）- 状态变化通知

```typescript
class FilterManager {
  private listeners: ((filters: FilterState) => void)[] = [];
  private filters: FilterState = { style: '', color: '' };

  subscribe(listener: (filters: FilterState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  setFilter(key: string, value: string) {
    this.filters = { ...this.filters, [key]: value };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.filters));
  }
}
```

---

## 重构优先级

### P0 - 立即执行（影响可维护性）

1. ✅ 拆分巨石组件 - 提取至少5个子组件
2. ✅ 封装自定义Hooks - 分离状态逻辑和UI
3. ✅ 消除代码重复 - 提取通用筛选器组件

### P1 - 短期执行（影响扩展性）

4. ✅ 引入状态管理 - Zustand或useReducer
5. ✅ 封装服务层 - API调用统一管理
6. ✅ 类型定义分离 - 独立types文件

### P2 - 中期执行（影响性能）

7. ⚠️ 性能优化 - useMemo/useCallback
8. ⚠️ 虚拟滚动 - 处理长列表
9. ⚠️ 图片懒加载优化

### P3 - 长期执行（提升质量）

10. 📋 单元测试覆盖
11. 📋 E2E测试
12. 📋 性能监控

---

## 重构后效果预期

### 代码质量提升

- 组件平均行数：**100-200行** ⬇️ 从1141行
- 单个Hook平均行数：**50-100行**
- 代码重复率：**< 5%** ⬇️ 从~30%
- 测试覆盖率：**> 80%** ⬆️ 从0%

### 开发体验提升

- ✅ 新功能开发时间减少50%
- ✅ Bug修复时间减少70%
- ✅ 代码Review效率提升80%
- ✅ 新人上手时间从3天减少到0.5天

### 性能提升

- ✅ 首屏渲染时间 < 1s
- ✅ 筛选响应时间 < 100ms
- ✅ 滚动帧率保持 60fps
- ✅ 内存占用减少30%

---

## 总结

当前代码是典型的"能跑就行"模式，技术债务严重。建议：

1. **立即停止在当前文件添加新功能**
2. **投入1-2周进行架构重构**
3. **建立代码Review机制，防止再次出现巨石组件**
4. **引入ESLint规则限制文件行数（建议300行上限）**

**记住：代码是写给人看的，不是写给机器看的。**
