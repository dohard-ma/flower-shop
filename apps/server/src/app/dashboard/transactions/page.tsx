"use client"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react"

// 模拟交易数据
const generateTransactions = () => {
  const types = ["Transfer", "Payment", "Deposit", "Withdrawal", "Investment"]
  const statuses = ["Completed", "Pending", "Failed", "Cancelled"]
  const accounts = ["Checking", "Savings", "Investment", "Credit Card"]
  const categories = ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Healthcare", "Education"]

  return Array.from({ length: 150 }, (_, i) => ({
    id: `TXN-${String(i + 1).padStart(6, "0")}`,
    date: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
    description: `Transaction ${i + 1}`,
    type: types[Math.floor(Math.random() * types.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    amount: (Math.random() * 5000 - 2500).toFixed(2),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    account: accounts[Math.floor(Math.random() * accounts.length)],
    merchant: `Merchant ${Math.floor(Math.random() * 50) + 1}`,
    isRecurring: Math.random() > 0.7,
  }))
}

const transactions = generateTransactions()

export default function TransactionsPage() {
  // 筛选状态
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilters, setTypeFilters] = useState([])
  const [accountFilter, setAccountFilter] = useState("all")
  const [amountRange, setAmountRange] = useState([-5000, 5000])
  const [showRecurringOnly, setShowRecurringOnly] = useState(false)
  const [showPositiveOnly, setShowPositiveOnly] = useState(false)

  // 表格状态
  const [selectedRows, setSelectedRows] = useState([])
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // 筛选和排序逻辑
  const filteredAndSortedTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesSearch =
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
      const matchesType = typeFilters.length === 0 || typeFilters.includes(transaction.type)
      const matchesAccount = accountFilter === "all" || transaction.account === accountFilter
      const matchesAmount =
        Number.parseFloat(transaction.amount) >= amountRange[0] &&
        Number.parseFloat(transaction.amount) <= amountRange[1]
      const matchesRecurring = !showRecurringOnly || transaction.isRecurring
      const matchesPositive = !showPositiveOnly || Number.parseFloat(transaction.amount) > 0

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesAccount &&
        matchesAmount &&
        matchesRecurring &&
        matchesPositive
      )
    })

    // 排序
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key]
        let bValue = b[sortConfig.key]

        if (sortConfig.key === "amount") {
          aValue = Number.parseFloat(aValue)
          bValue = Number.parseFloat(bValue)
        } else if (sortConfig.key === "date") {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [
    searchTerm,
    statusFilter,
    typeFilters,
    accountFilter,
    amountRange,
    showRecurringOnly,
    showPositiveOnly,
    sortConfig,
  ])

  // 分页逻辑
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / pageSize)
  const paginatedTransactions = filteredAndSortedTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  // 处理排序
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  // 处理多选
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(paginatedTransactions.map((t) => t.id))
    } else {
      setSelectedRows([])
    }
  }

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id])
    } else {
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id))
    }
  }

  // 处理类型多选
  const handleTypeFilterChange = (type, checked) => {
    if (checked) {
      setTypeFilters((prev) => [...prev, type])
    } else {
      setTypeFilters((prev) => prev.filter((t) => t !== type))
    }
  }

  // 重置筛选
  const resetFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setTypeFilters([])
    setAccountFilter("all")
    setAmountRange([-5000, 5000])
    setShowRecurringOnly(false)
    setShowPositiveOnly(false)
  }

  // 批量操作
  const handleBulkDelete = () => {
    console.log("Deleting transactions:", selectedRows)
    setSelectedRows([])
  }

  const handleExport = () => {
    console.log("Exporting transactions...")
  }

  // 状态样式
  const getStatusBadge = (status) => {
    const variants = {
      Completed: "default",
      Pending: "secondary",
      Failed: "destructive",
      Cancelled: "outline",
    }
    return <Badge variant={variants[status]}>{status}</Badge>
  }

  const getAmountColor = (amount) => {
    return Number.parseFloat(amount) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={resetFilters}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset Filters
          </Button>
        </div>
      </div>

      {/* 筛选区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 搜索框 */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* 状态筛选 */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 账户筛选 */}
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="Checking">Checking</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Investment">Investment</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 类型多选 */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {typeFilters.length === 0 ? "All Types" : `${typeFilters.length} selected`}
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>Transaction Types</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["Transfer", "Payment", "Deposit", "Withdrawal", "Investment"].map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={typeFilters.includes(type)}
                      onCheckedChange={(checked) => handleTypeFilterChange(type, checked)}
                    >
                      {type}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 金额范围 */}
            <div className="space-y-2">
              <Label>
                Amount Range: ${amountRange[0]} - ${amountRange[1]}
              </Label>
              <Slider
                value={amountRange}
                onValueChange={setAmountRange}
                max={5000}
                min={-5000}
                step={100}
                className="w-full"
              />
            </div>

            {/* 开关筛选 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="recurring" checked={showRecurringOnly} onCheckedChange={setShowRecurringOnly} />
                <Label htmlFor="recurring">Recurring transactions only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="positive" checked={showPositiveOnly} onCheckedChange={setShowPositiveOnly} />
                <Label htmlFor="positive">Positive amounts only</Label>
              </div>
            </div>

            {/* 日期范围 */}
            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 批量操作 */}
      {selectedRows.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{selectedRows.length} transaction(s) selected</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Selected
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete {selectedRows.length} transaction(s).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 表格 */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions ({filteredAndSortedTransactions.length} results)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === paginatedTransactions.length && paginatedTransactions.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("id")}>
                    <div className="flex items-center">
                      ID
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("date")}>
                    <div className="flex items-center">
                      Date
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("amount")}>
                    <div className="flex items-center">
                      Amount
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Merchant</TableHead>
                  <TableHead className="sticky right-0 bg-background">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.includes(transaction.id)}
                        onCheckedChange={(checked) => handleSelectRow(transaction.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                    <TableCell>{transaction.date.toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{transaction.description}</div>
                        {transaction.isRecurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell className={getAmountColor(transaction.amount)}>
                      ${Math.abs(Number.parseFloat(transaction.amount)).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>{transaction.account}</TableCell>
                    <TableCell>{transaction.merchant}</TableCell>
                    <TableCell className="sticky right-0 bg-background">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 分页 */}
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">Rows per page</p>
              <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
