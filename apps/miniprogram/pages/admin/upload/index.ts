import { getQiniuToken, uploadToQiniu } from '@/utils/qiniu';
import { analyzeFlowerImage } from '@/utils/apis/project';
import { uploadTaskStorage, UploadTask, storage, STORAGE_KEYS } from '@/utils/storage';
import { getFileExtension } from '@/utils/file';


interface AIAnalysisResult {
  product_title: string;
  store_category?: string; // AI分析可能不返回这个字段
  flowers: string[];
  color_series: string;
  suitable_for?: string[]; // AI分析可能不返回这个字段
  stem_count?: number; // AI分析可能不返回这个字段
  style?: string; // AI分析可能返回这个字段
}

Page({
  data: {
    uploadTasks: [] as Array<UploadTask & { selected?: boolean }>,

    // 批量操作相关
    selectedTasks: [] as string[],

    // AI分析开关
    aiAnalysisEnabled: true
  },

  onShow() {
    // 页面显示时刷新任务列表
    this.loadUploadTasks();
    // 清理过期任务
    // 暂时不做清理
    // this.cleanupTasks();
  },

  /**
   * 加载上传任务列表
   */
  loadUploadTasks() {
    // 从本地缓存中获取上传任务列表
    const cachedTasks = uploadTaskStorage.getTasks();
    // 为每个任务添加 selected 属性（UI 状态，不持久化）
    const tasksWithSelection = cachedTasks.map(task => ({
      ...task,
      selected: this.data.selectedTasks.includes(task.id) || false
    }));
    this.setData({ uploadTasks: tasksWithSelection });

    // 从缓存中读取AI分析开关状态
    const aiAnalysisEnabled = storage.getItem(STORAGE_KEYS.AI_ANALYSIS_ENABLED);
    if (aiAnalysisEnabled !== null) {
      this.setData({ aiAnalysisEnabled });
    }

    console.log('从缓存加载上传任务列表:', cachedTasks.length, '个任务');
    console.log('AI分析开关状态:', this.data.aiAnalysisEnabled);
  },

  /**
   * 保存任务列表到缓存
   */
  saveTasksToCache() {
    uploadTaskStorage.updateTasks(this.data.uploadTasks);
    console.log('任务列表已保存到缓存');
  },

  // /**
  //  * 从缓存更新任务列表（统一的数据更新方法）
  //  */
  // refreshTasksFromCache() {
  //   const cachedTasks = storage.getItem(STORAGE_KEYS.UPLOAD_TASKS) || [];
  //   this.setData({ uploadTasks: cachedTasks });
  // },

  /**
   * 更新任务列表（统一方法：先更新 storage，再刷新页面）
   */
  updateUploadTasks(updater: (tasks: UploadTask[]) => UploadTask[]) {
    const currentTasks = uploadTaskStorage.getTasks();
    const updatedTasks = updater(currentTasks);
    uploadTaskStorage.updateTasks(updatedTasks);
    // 为每个任务添加 selected 属性（保持 UI 状态）
    const tasksWithSelection = updatedTasks.map(task => ({
      ...task,
      selected: this.data.selectedTasks.includes(task.id) || false
    }));
    this.setData({ uploadTasks: tasksWithSelection });
    console.log('任务列表已更新并保存到缓存');
  },

  /**
   * 清理过期或已完成的任务
   */
  // cleanupTasks() {
  //   const now = Date.now();
  //   const oneDayAgo = now - 24 * 60 * 60 * 1000; // 24小时前

  //   const filteredTasks = this.data.uploadTasks.filter(task => {
  //     // 保留未完成的任务和24小时内的已完成任务
  //     if (task.status === 'uploading' || task.status === 'analyzing' || task.status === 'pending') {
  //       return true;
  //     }
  //     if (task.status === 'confirmed' && task.createdAt > oneDayAgo) {
  //       return true;
  //     }
  //     return false;
  //   });

  //   if (filteredTasks.length !== this.data.uploadTasks.length) {
  //     this.setData({ uploadTasks: filteredTasks });
  //     this.saveTasksToCache();
  //     console.log('清理了', this.data.uploadTasks.length - filteredTasks.length, '个过期任务');
  //   }
  // },


  /**
   * 点击任务项
   */
  onTaskItemTap(e: any) {
    const taskId = e.currentTarget.dataset.item?.id;

    // 跳转到详情页编辑
    wx.navigateTo({
      url: `/pages/admin/detail/index?id=${taskId}&mode=create`
    });
  },

  /**
   * 批量选择图片并开始上传
   */
  onAddProduct() {
    console.log('开始批量上传');

    wx.chooseMedia({
      count: 50, // 最多50张
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        console.log('选择了', res.tempFiles.length, '张图片');
        this.startBatchUpload(res.tempFiles);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
      }
    });
  },

  /**
   * 开始批量上传处理
   */
  async startBatchUpload(files: any[]) {
    const tasks: UploadTask[] = [];

    // 每张图片创建一个独立的商品任务
    files.forEach((file, index) => {
      const taskId = `task_${Date.now()}_${index}`;

      const task: UploadTask = {
        id: taskId,
        image: file.tempFilePath,
        status: 'uploading',
        progress: 0,
        createdAt: Date.now() + index // 确保每个任务的时间戳不同
      };

      tasks.push(task);
    });

    // 添加到任务列表（新任务在前面）
    this.updateUploadTasks((currentTasks) => {
      return [...tasks, ...currentTasks];
    });

    // 开始处理每个任务（可以并发处理）
    tasks.forEach(task => {
      this.processTask(task.id);
    });
  },

  /**
   * 处理单个任务
   */
  async processTask(taskId: string) {
    try {
      // 1. 上传图片
      await this.uploadTaskImages(taskId);

      // 2. AI分析（如果开启）
      if (this.data.aiAnalysisEnabled) {
        await this.analyzeTaskWithAI(taskId);
      }

      // 3. 更新状态为待确认
      this.updateTaskStatus(taskId, 'pending', 100);

    } catch (error: any) {
      console.error('处理任务失败:', error);
      this.updateTaskStatus(taskId, 'failed', 0, error?.message || '处理失败');
    }
  },

  /**
   * 上传任务图片
   */
  async uploadTaskImages(taskId: string) {
    const task = this.data.uploadTasks.find(t => t.id === taskId);
    if (!task) return;

    console.log('开始上传图片:', taskId);

    try {
      // 获取上传token
      this.updateTaskStatus(taskId, 'uploading', 10);
      const { token, ossKey, domain } = await getQiniuToken('public');

      // 获取文件类型后缀
      const fileExtension = getFileExtension(task.image, 'image');
      const ossKeyWithExt = `${ossKey}.${fileExtension}`;

      console.log('文件类型检测:', {
        filePath: task.image,
        extension: fileExtension,
        ossKey: ossKeyWithExt
      });

      // 上传到七牛云
      this.updateTaskStatus(taskId, 'uploading', 30);
      const uploadResult = await uploadToQiniu(task.image, {
        token,
        ossKey: ossKeyWithExt,
        domain
      });

      this.updateTaskStatus(taskId, 'uploading', 50);

      // 更新任务的图片URL（使用带后缀的 key）
      const finalKey = uploadResult.key || ossKeyWithExt;
      const imageUrl = `${domain}/${finalKey}`;

      // 更新任务状态（同时更新 image 和 images 字段以保持兼容）
      this.updateUploadTasks((tasks) => {
        return tasks.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              image: imageUrl, // 主图（兼容旧数据）
              images: [imageUrl] // 图片数组（新数据结构）
            };
          }
          return t;
        });
      });
      console.log('图片上传完成:', taskId, uploadResult);

    } catch (error) {
      console.error('图片上传失败:', error);
      throw error;
    }
  },

  /**
   * AI分析任务
   */
  async analyzeTaskWithAI(taskId: string) {
    // 从 storage 获取最新任务数据
    const task = uploadTaskStorage.getTask(taskId);
    if (!task) return;

    console.log('开始AI分析:', taskId);
    this.updateTaskStatus(taskId, 'analyzing', 60);

    try {
      // 获取最终的图片URL（优先使用已上传的URL）
      const imageUrl = this.isImageUploaded(task.image) ? task.image : (task.images && task.images.length > 0 ? task.images[0] : task.image);

      // 调用AI分析接口
      this.updateTaskStatus(taskId, 'analyzing', 70);
      const response = await analyzeFlowerImage(imageUrl);

      if (!response.success) {
        throw new Error(response.message);
      }

      this.updateTaskStatus(taskId, 'analyzing', 90);

      const { analysis } = response.data;

      // 更新任务的AI分析结果
      this.updateUploadTasks((tasks) => {
        return tasks.map(t => {
          if (t.id === taskId) {
            // 将分析结果转换为完整的 AIAnalysisResult（根据实际 API 返回的数据）
            const aiResult: AIAnalysisResult = {
              product_title: analysis.product_title,
              flowers: analysis.flowers,
              color_series: analysis.color_series,
              style: analysis.style
            };
            return {
              ...t,
              aiResult,
              title: analysis.product_title,
              style: analysis.style || '',
              flowers: analysis.flowers.join(','),
              colorSeries: analysis.color_series || '',
            };
          }
          return t;
        });
      });
      console.log('AI分析完成:', taskId, analysis);

    } catch (error) {
      console.error('AI分析失败:', error);
      throw error;
    }
  },

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId: string, status: UploadTask['status'], progress: number, error?: string) {
    this.updateUploadTasks((tasks) => {
      return tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, status, progress, error };
        }
        return task;
      });
    });
  },


  /**
   * 删除单个任务
   */
  deleteTask(taskId: string) {
    this.updateUploadTasks((tasks) => {
      return tasks.filter(task => task.id !== taskId);
    });
    console.log('删除任务:', taskId);
  },

  /**
   * 切换AI分析开关
   */
  toggleAIAnalysis() {
    const aiAnalysisEnabled = !this.data.aiAnalysisEnabled;
    this.setData({ aiAnalysisEnabled });

    // 保存设置到本地存储
    storage.setItem(STORAGE_KEYS.AI_ANALYSIS_ENABLED, aiAnalysisEnabled);
  },

  /**
   * 清空选择
   */
  clearSelection() {
    console.log('清空选择前:', this.data.selectedTasks);
    // 清空选中状态，并更新所有任务的 selected 属性
    const updatedTasks = this.data.uploadTasks.map(task => ({
      ...task,
      selected: false
    }));

    this.setData({
      selectedTasks: [],
      uploadTasks: updatedTasks
    }, () => {
      console.log('清空选择后:', this.data.selectedTasks);
    });
  },

  /**
   * checkbox-group 的 change 事件
   */
  onCheckboxChange(e: any) {
    const selectedValues = e.detail.value as string[];
    console.log('选中的任务ID:', selectedValues);
    this.setData({
      selectedTasks: selectedValues.concat([])
    });
  },

  /**
   * 复选框点击事件（手动管理选中状态）
   */
  onCheckboxTap(e: any) {
    const taskId = e.currentTarget.dataset.taskId;
    const { selectedTasks, uploadTasks } = this.data;

    // 更新 selectedTasks 数组
    let newSelectedTasks: string[];
    if (selectedTasks.includes(taskId)) {
      newSelectedTasks = selectedTasks.filter(id => id !== taskId);
    } else {
      newSelectedTasks = [...selectedTasks, taskId];
    }

    // 更新 uploadTasks 中对应任务的 selected 状态
    const updatedTasks = uploadTasks.map(task => ({
      ...task,
      selected: newSelectedTasks.includes(task.id)
    }));

    this.setData({
      selectedTasks: newSelectedTasks,
      uploadTasks: updatedTasks
    });
  },

  /**
   * 阻止事件冒泡（用于复选框容器）
   */
  stopPropagation() {
    // 空函数，仅用于阻止事件冒泡
  },


  /**
   * 批量删除
   */
  onBatchDelete() {
    const { selectedTasks } = this.data;
    if (selectedTasks.length === 0) {
      wx.showToast({
        title: '请先选择要删除的任务',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedTasks.length} 个任务吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteSelectedTasks();
        }
      }
    });
  },

  /**
   * 批量操作后清空选择
   */
  clearSelectionAfterBatch() {
    // 清空选中状态，并更新所有任务的 selected 属性
    const updatedTasks = this.data.uploadTasks.map(task => ({
      ...task,
      selected: false
    }));

    this.setData({
      selectedTasks: [],
      uploadTasks: updatedTasks
    });
  },

  /**
   * 删除选中的任务
   */
  deleteSelectedTasks() {
    const { selectedTasks } = this.data;

    this.updateUploadTasks((tasks) => {
      return tasks.filter(task => !selectedTasks.includes(task.id));
    });

    this.setData({
      selectedTasks: [],
      isSelectionMode: false
    });

    wx.showToast({
      title: `已删除 ${selectedTasks.length} 个任务`,
      icon: 'success'
    });
  },

  /**
   * 判断图片是否已上传到七牛云
   */
  isImageUploaded(imageUrl: string): boolean {
    // 如果URL是完整的HTTP/HTTPS地址，说明已上传
    return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
  },

  /**
   * 批量重新分析（并行处理）
   */
  async onBatchReanalyze() {
    const { selectedTasks } = this.data;
    if (selectedTasks.length === 0) {
      wx.showToast({
        title: '请先选择要分析的任务',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: `正在分析 ${selectedTasks.length} 个任务...`,
      mask: true
    });

    try {
      // 并行处理所有选中的任务
      const results = await Promise.allSettled(
        selectedTasks.map(taskId => this.reanalyzeTask(taskId))
      );

      // 统计成功和失败的数量
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      // 刷新任务列表
      this.loadUploadTasks();

      // 清空选择
      this.clearSelectionAfterBatch();

      wx.hideLoading();

      // 显示处理结果
      if (failedCount === 0) {
        wx.showToast({
          title: `全部 ${successCount} 个任务分析完成`,
          icon: 'success'
        });
      } else if (successCount === 0) {
        wx.showToast({
          title: `全部 ${failedCount} 个任务分析失败`,
          icon: 'none',
          duration: 2000
        });
      } else {
        wx.showModal({
          title: '批量分析完成',
          content: `成功: ${successCount} 个，失败: ${failedCount} 个`,
          showCancel: false,
          confirmText: '知道了'
        });
      }
    } catch (error: any) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '批量分析失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 重新分析单个任务
   */
  async reanalyzeTask(taskId: string) {
    // 从 storage 获取最新任务数据
    const task = uploadTaskStorage.getTask(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }

    try {
      // 判断图片是否已上传到七牛云
      let imageUrl = task.image;

      // 如果图片还是本地路径，需要先上传
      if (!this.isImageUploaded(imageUrl)) {
        console.log('图片未上传，先上传到七牛云:', taskId);

        // 先上传图片
        await this.uploadTaskImages(taskId);

        // 重新从 storage 获取任务数据（图片URL已更新）
        const updatedTask = uploadTaskStorage.getTask(taskId);
        if (updatedTask && this.isImageUploaded(updatedTask.image)) {
          imageUrl = updatedTask.image;
          // 更新本地任务列表
          this.loadUploadTasks();
        } else {
          throw new Error('图片上传失败');
        }
      }

      // 执行AI分析
      await this.analyzeTaskWithAI(taskId);

    } catch (error: any) {
      console.error('重新分析任务失败:', taskId, error);
      this.updateTaskStatus(taskId, 'failed', 0, error.message || '分析失败');
      throw error;
    }
  },

})