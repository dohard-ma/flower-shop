export const STORAGE_KEYS = {
  PRODUCTS: "products",
  GIFT_CARD: "gift_card",
  USER: "user",
  TOKEN: "token",
  USER_ID: "user_id",
  AUTH_TOKEN: "auth_token",
  USER_INFO: "user_info",
  UPLOAD_TASKS: "uploadTasks",
  AI_ANALYSIS_ENABLED: "ai_analysis_enabled",
  INPUT_MODE: "input_mode",
  OPENID: "openid",
  STORE_ID: "store_id",
}

export const storage = {
  setItem(key: string, value: any): void {
    wx.setStorageSync(key, value);
  },
  getItem(key: string): any {
    return wx.getStorageSync(key);
  },
  removeItem(key: string): void {
    wx.removeStorageSync(key);
  }
};


export interface UploadTask {
  id: string;
  image: string; // 主图URL（兼容旧数据，列表页上传时使用）
  images?: string[]; // 图片URL数组（详情页支持多图）
  videos?: string[]; // 视频URL数组（详情页支持视频）
  status: 'uploading' | 'analyzing' | 'pending' | 'confirmed' | 'failed';
  progress: number;
  title?: string;
  price?: number;
  category?: string;
  colorSeries?: string;
  suitableFor?: string[];
  storeCode?: string;
  stock?: number;
  style?: string;
  /**
   * 枝数/朵数
   */
  quantity?: number;
  /**
   * 花材
   */
  flowers?: string;
  createdAt: number;
}


class UploadTaskStorage {
  private readonly key = STORAGE_KEYS.UPLOAD_TASKS;

  getTasks(): UploadTask[] {
    return storage.getItem(this.key) || [];
  }

  updateTask(task: UploadTask): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = task;
    }
    this.updateTasks(tasks);
  }

  updateTasks(tasks: UploadTask[]): void {
    storage.setItem(this.key, tasks);
  }

  addTask(task: UploadTask): void {
    const tasks = this.getTasks();
    tasks.push(task);
    this.updateTasks(tasks);
  }

  removeTask(id: string): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks.splice(index, 1);
    }
    this.updateTasks(tasks);
  }

  getTask(id: string): UploadTask | undefined {
    const tasks = this.getTasks();
    return tasks.find(t => t.id === id);
  }
}

export const uploadTaskStorage = new UploadTaskStorage();