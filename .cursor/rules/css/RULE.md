---
alwaysApply: true
---

# Global Rules for One-Person Company Development (WeChat Mini Program)

## CSS & UI Guidelines (Atomic Design System)

### 1. Core Principle: Utility-First

* **Anti-Semantic:** Do NOT use page-specific class names like `.profile-header` or `.order-list`.
* **Atom Vocabulary:** Construct 98% of the UI using the global `atom.wxss`.
* **TDesign:** Use TDesign components for complex logic. Use Atom classes for layout/spacing *wrapping* them.

### 2. The "Living Atom" Protocol (Crucial)

*We treat `atom.wxss` as a growing standard library.*

* **If a style exists:** Use it (e.g., `mt-20`, `text-lg`).
* **If a style is MISSING:**
* **Step 1:** Do NOT write inline styles (e.g., `style="margin-top: 32rpx"`).
* **Step 2:** Do NOT create a local `.wxss` file.
* **Step 3:** **Invent** the atomic class following the Naming Standard (e.g., `mt-32`) and use it in WXML.
* **Step 4:** At the end of your response, **explicitly provide the CSS code** to be added to `atom.wxss`.

### 3. Atom Definition Standards

*Only define classes that follow these strict rules in `atom.wxss`:*

* **Single Responsibility:** One class = One property (Exceptions: `flex-center`, `truncate`).
* **Units:** All dimensions MUST use `rpx`.
* **Naming Convention (Tailwind-like):**
* `{property}-{value}`: `mt-20` (margin-top), `p-30` (padding), `text-white` (color), `w-full` (width).
* `{property}-{size}`: `text-lg`, `rounded-md`.

* **Forbidden:** Do NOT define business-logic names in atom (e.g., `.avatar-box`, `.active-tab`).

### 4. Code Generation Example

**Scenario:** You need a top margin of 88rpx, but `mt-88` is not in the standard list.

**✅ Correct Output:**

```html
<view class="flex-col bg-white p-30 rounded-md">
  <text class="text-xl font-bold">Title</text>
  <view class="mt-88 text-center text-999">
    Content at bottom
  </view>
</view>

```

```css
/* 💡 [Action Required] Append this to atom.wxss: */
.mt-88 { margin-top: 88rpx; }

```

### 📚 Reference Vocabulary (Base Set)

* **Layout:** `flex`, `flex-row`, `flex-col`, `flex-1`, `flex-none`, `justify-start/center/between/end`, `items-center/end/stretch`, `relative`, `absolute`.
* **Spacing:** `m-0`, `mt/mb/ml/mr-{N}`, `p-0`, `p-{N}`, `px/py-{N}`, `gap-{N}`. (N = 10, 20, 24, 30, 32, 40...)
* **Visual:** `bg-white`, `bg-f5`, `rounded-sm/md/lg/full`, `border-bottom`.
* **Text:** `text-xs/sm/base/lg/xl/xxl`, `font-bold`, `text-center`, `text-333`, `text-666`, `text-999`, `truncate`.
