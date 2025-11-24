# TCB/Weda 数据模型 (database-schemas) 配置规则

本文档基于对 `datasource_data-4GerqfZuD.json` (shop_spu) 等标准 TCB/Weda 数据模型配置文件的分析，总结了生成和理解这些 JSON Schema 文件的关键规则。

## 1. 顶层元数据

每个模型文件都应包含以下顶层元数据：

- `previewTableName`: `string` - 预览环境的表名，通常为 `[name]-preview`。
- `publishCacheStatus`: `"ready"` (或其他状态) - 模型发布的缓存状态。
- `subType`: `"database"` - 子类型。
- `schema`: `object` - 核心 Schema 定义，包含以下内容。
- `dbInstanceType`: `"MYSQL"` (或其他) - 数据库实例类型。
- `title`: `string` - 模型的可读标题/名称。
- `name`: `string` - 模型的唯一标识符/名称（通常与文件名、表名对应，例如 `wx_user`）。
- `dbLinkType`: `"internal"` (或其他) - 数据库链接类型。
- `tableNameRule`: `"only_name"` 或 `"has_lcap"` (或其他) - 表名生成规则。
- `type`: `"database"` - 类型。
- `updateTime`: `string` (ISO 8601 格式) - 最后更新时间。
- `publishedTableName`: `string` - 正式发布的表名，通常与 `name` 相同。
- `id`: `string` - 数据源的唯一 ID，例如 `data-user-001`。
- `dbSourceType`: `"internal_mysql"` (或其他) - 数据库源类型。
- `methods`: `array` - 自定义方法列表（通常为空，使用默认方法）。
- `fun`: `string` (JSON 字符串) - 包含版本和发布时间戳的附加信息。
- `publishStatus`: `number` (例如 `1`) - 发布状态。
- `configuration`: `object` - 其他配置（通常为空）。

## 2. Schema 定义 (`schema` 对象内部)

- `x-primary-column`: `string` - 主键字段名 (例如 `"_id"`)。
- `x-kind`: `"tcb"` - 表明是 TCB 数据模型。
- `x-defaultMethods`: `array` - 平台默认提供的 CRUD 方法列表 (例如 `["wedaCreate", "wedaGetList", ...]`)。
- `type`: `"object"` - Schema 类型。
- `x-relatedType`: `"exist"` (通常) - 关联类型。
- `title`: `string` - (可选) Schema 级别的标题。
- `x-viewId`: `string` - 视图 ID (例如 `"view-xxxxxxxxxx"`)。
- `required`: `array` - 必需字段的名称列表 (根据 Prisma schema 中的非空字段生成)。
- `properties`: `object` - 包含所有字段定义的映射。

## 3. 字段属性定义 (`properties` 对象内部的每个字段)

每个字段定义是一个对象，包含以下常见属性：

**重要注意事项：关于字段键名与内部 `name` 属性**
在 `properties` 对象中，每个字段由一个键名（例如 `"productName"`）标识。字段本身的定义（对象值）**可能**包含一个 `name` 属性（例如 `"name": "product_name"`），尤其是在从其他 Schema（如 Prisma 的 `@map`）转换时。
**关键规则**：如果字段定义中存在 `name` 属性，其值**必须**与 `properties` 中使用的键名完全相同。如果两者不匹配，在平台（如腾讯云微搭）上操作时，通常会遇到类似 `Schema的name和对应schema相关的key不匹配` 的错误。
**解决方案**：

1. 确保 `properties` 中的键名和字段定义内部的 `name` 属性值一致。
2. （**推荐且更简单**）直接**移除**字段定义内部的 `name` 属性。平台会默认使用 `properties` 中的键名作为字段的标识符。

### 3.1 通用属性

- `type`: `string` - 字段的数据类型 (例如 `"string"`, `"number"`, `"boolean"`, `"array"`, `"object"`).
  - Prisma `BigInt` (ID) -> TCB `string`
  - Prisma `String` -> TCB `string`
  - Prisma `Int` / `Float` / `Decimal` -> TCB `number`
  - Prisma `Boolean` -> TCB `boolean`
  - Prisma `DateTime` (时间戳) -> TCB `number` (`format: "datetime"`)
  - Prisma `DateTime` (@db.Date) -> TCB `string` (`format: "date"`)
  - Prisma `Json` -> TCB `object` 或 `string`
- `title`: `string` - 字段的可读标题。
- `description`: `string` (可选) - 字段的描述。
- `default`: (可选) - 字段的默认值。
- `x-id`: `string` - 字段在平台内的唯一内部标识符 (例如 `"35e884e"`), **此 ID 对于同一模型内的不同字段必须唯一，对于不同模型之间的同名字段也建议保持唯一性，但更重要的是在模型内唯一。**
- `x-index`: `number` (可选) - 字段的排序索引。
- `x-unique`: `boolean` (可选, 默认为 `false`) - 字段值是否唯一 (对应 Prisma `@unique`)。
- `x-required`: `boolean` (可选, 默认为 `false`) - 字段是否必需 (补充根级别的 `required` 数组)。
- `x-hidden`: `boolean` (可选, 默认为 `false`) - 字段是否在界面上隐藏 (通常用于系统字段)。
- `format`: `string` (可选) - 字段的特定格式，用于增强类型表达或 UI 展示。

### 3.2 特定格式 (`format`)

- **`x-` 前缀规则**：通常，特定于 TCB/Weda 平台或扩展功能的 `format` 值需要加 `x-` 前缀 (例如 `x-image`, `x-rtf`, `x-enum`)。标准或通用的格式值 (例如 `datetime`, `date`, `father-son`, `one-many`, `many-many`) 则不需要 `x-` 前缀。

- **图片 (单个)**: `type: "string", format: "x-image"`。可附加 `x-image-size: number` (字节)。
- **图片 (多个/数组)**: `type: "array", items: { type: "string", format: "x-image" }`。
- **富文本**: `type: "string", format: "x-rtf"`。
- **枚举 (字符串)**: `type: "string", format: "x-enum"`.
  - `enum`: `array` - 枚举值的列表 (例如 `["VAL1", "VAL2"]`)。
  - `x-enumObj`: `array` - 枚举标签和值的对象列表 (例如 `[{label: "标签1", value: "VAL1"}, ...]`)。
  - `x-enum-type`: (可选, 例如 `"general-option"`)。
  - `x-multi-select`: `boolean` (可选, 是否支持多选)。
- **日期时间 (时间戳)**: `type: "number", format: "datetime"` (无 `x-` 前缀)。
- **日期**: `type: "number", format: "date"` (无 `x-` 前缀)。
- **父子/引用关系**: `format: "father-son"` (无 `x-` 前缀, 详见关系定义)。
- **一对多关系 (数组)**: `format: "one-many"` (无 `x-` 前缀, 详见关系定义)。
- **多对多关系 (数组)**: `format: "many-many"` (无 `x-` 前缀, 详见关系定义)。

### 3.3 关系定义 (`x-parent`)

关系通过 `x-parent` 对象定义，通常配合特定的 `format`。

- **`format: "father-son"` (一对一 / 一对多中的 "一" 方引用)**:
  - `x-parent`:
    - `fatherAction`: `"judge"` (通常)
    - `type`: `"father-son"`
    - `parentDataSourceName`: `string` - 被引用的父数据源/模型名称 (例如 `"sys_user"`)。
- **`format: "one-many"` (一对多中的 "多" 方数组)**:
  - `type: "array"`
  - `items`: `{ type: "object", properties: { "_id": { type: "string", title: "数据标识" } } }` (通常只包含ID)
  - `deleteWay`: `"doNothing"` 或 `"delete"`
  - `x-parent`:
    - `parentFieldKey`: `string` - 在子模型中用于关联回此父模型的外键字段名。
    - `parentFieldTitle`: `string` - 子模型中关联字段的标题。
    - `parentDataSourceName`: `string` - 子数据源/模型名称。
- **`format: "many-many"` (多对多数组)**:
  - `type: "array"`
  - `items`: `{ type: "object", properties: { "_id": { type: "string", title: "数据标识" } } }` (通常只包含ID)
  - `deleteWay`: `"doNothing"`
  - `x-parent`:
    - `parentFieldKey`: `string` - 在**目标关联模型**中用于关联回此模型的字段名 (通常是目标模型的数组字段，指向当前模型)。
    - `parentFieldTitle`: `string` - 目标关联模型中关联字段的标题。
    - `parentDataSourceName`: `string` - 目标关联数据源/模型名称。

### 3.4 系统字段 (`x-system: true`)

系统字段具有标准结构，通常包括：

- `_id`: (主键) `type: "string", title: "数据标识", x-unique: true, x-system: true`
- `owner`: `type: "string", title: "所有人", format: "father-son", x-parent: { parentDataSourceName: "sys_user" }, x-system: true, x-hidden: true`
- `_mainDep`: (可选) `type: "string", title: "所属主管部门", format: "father-son", x-parent: { parentDataSourceName: "sys_department" }, x-system: true, x-hidden: true`
- `createdAt`: `type: "number", title: "创建时间", format: "datetime", x-system: true`
- `createBy`: `type: "string", title: "创建人", format: "father-son", x-parent: { parentDataSourceName: "sys_user" }, x-system: true, x-hidden: true`
- `updatedAt`: `type: "number", title: "更新时间", format: "datetime", x-system: true`
- `updateBy`: `type: "string", title: "修改人", format: "father-son", x-parent: { parentDataSourceName: "sys_user" }, x-system: true, x-hidden: true`
- `_openid`: (微信环境特有) `type: "string", title: "记录创建者", x-system: true`

所有系统字段和业务字段都应包含唯一的 `x-id` 和可选的 `x-index`。

## 4. 示例 `shop_spu` 的 `cate` 字段 (多对多)

```json
"cate": {
    "maxItems": 50,
    "name": "cate", // 字段名
    "format": "many-many",
    "deleteWay": "doNothing",
    "title": "分类",
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "_id": { // 指向关联表的 _id
                "name": "_id",
                "title": "数据标识",
                "type": "string"
            }
        }
    },
    "x-parent": { // 指向 shop_spu_cate 模型
        "parentFieldKey": "spu", // 在 shop_spu_cate 中，应该有一个名为 spu 的字段 (类型也是 many-many array) 指回 shop_spu
        "parentFieldTitle": "SPU",
        "parentDataSourceName": "shop_spu_cate" // 关联的模型名称
    }
}
```

这表示 `shop_spu` 和 `shop_spu_cate` 之间存在多对多关系。`shop_spu.cate` 是一个数组，存储了关联的 `shop_spu_cate` 记录的 `_id`。同时，在 `shop_spu_cate` 模型中，也应该有一个名为 `spu` (由 `parentFieldKey` 指定) 的字段，它也是一个 `many-many` 数组，存储关联的 `shop_spu` 记录的 `_id`。

---

**注意**:

- `x-id` 的值应该是唯一的字符串，通常是随机生成的，用于平台内部标识。
- `x-parent` 中的 `parentDataSourceName` 应与目标模型文件名（不含 `.json` 后缀）或其 `name` 字段一致。
- 上述规则是基于观察和推断，实际使用时请参考官方文档或通过 CLI 导出的文件进行验证。
