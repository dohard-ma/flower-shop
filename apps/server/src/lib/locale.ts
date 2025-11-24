import { zhCN } from 'date-fns/locale';

// 全局中文配置
export const locale = zhCN;

// 日期格式配置
export const dateFormats = {
    full: "yyyy年MM月dd日", // 2024年01月15日
    short: "MM-dd", // 01-15
    long: "yyyy年MM月dd日 HH:mm", // 2024年01月15日 14:30
    time: "HH:mm", // 14:30
};

// 中文文本配置
export const texts = {
    calendar: {
        selectDate: "选择日期",
        selectStartDate: "选择开始时间",
        selectEndDate: "选择结束时间",
        selectDeliveryDate: "选择发货时间",
    },
    common: {
        confirm: "确认",
        cancel: "取消",
        save: "保存",
        edit: "编辑",
        delete: "删除",
        loading: "加载中...",
        noData: "暂无数据",
    },
    status: {
        pending: "待确认",
        confirmed: "已确认",
        shipped: "已发货",
        completed: "已完成",
        cancelled: "已取消",
    }
};