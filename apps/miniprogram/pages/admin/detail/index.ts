import { analyzeVoiceText, transcribeVoice, createProduct, updateProduct } from '@/utils/apis/project';
import { uploadTaskStorage, UploadTask, storage, STORAGE_KEYS } from '@/utils/storage';
import { getQiniuToken, uploadToQiniu } from '@/utils/qiniu';
import { getFileExtension } from '@/utils/file';

interface MediaItem {
  type: 'image' | 'video';
  url: string;
  tempPath?: string;
}

interface ProductFormData {
  id?: number;
  title: string;
  price: number;
  category: string;
  storeCode: string;
  flowers: string;
  colorScheme: string;
  targetAudience: string;
  quantity: number;
  style: string;
  stock: number;
  status: 'active' | 'inactive' | 'draft';
}

Page({
  data: {
    mode: 'create' as 'create' | 'edit',
    productId: 0,
    currentEditTaskId: '' as string, // 当前编辑的上传任务ID（用于同步缓存）
    mediaList: [] as MediaItem[],
    formData: {
      title: '',
      price: 0,
      category: '',
      storeCode: '',
      flowers: '',
      colorScheme: '',
      targetAudience: '',
      quantity: 0,
      style: '',
      stock: 0,
      status: 'active'
    } as ProductFormData,

    // 选择器选项
    styleOptions: ['花束', '花篮', '花盒', '桌花', '手捧花', '抱抱桶', '开业花篮', '其他'],
    styleIndex: -1,
    colorOptions: ['红色', '粉色', '白色', '黄色', '紫色', '蓝色', '混搭'],
    colorIndex: -1,
    // 适用人群选项（带选中标识）
    targetAudienceOptions: [
      { value: '恋人', selected: false },
      { value: '母亲', selected: false },
      { value: '朋友', selected: false },
      { value: '长辈', selected: false },
      { value: '同事', selected: false },
      { value: '客户', selected: false },
      { value: '自己', selected: false },
      { value: '生日', selected: false },
      { value: '情人节', selected: false },
      { value: '婚礼', selected: false },
      { value: '开业', selected: false },
      { value: '探病', selected: false }
    ] as Array<{ value: string; selected: boolean }>,

    // 语音输入相关
    inputMode: storage.getItem(STORAGE_KEYS.INPUT_MODE) || 'voice' as 'voice' | 'text', // 输入模式：语音录入 或 文本输入
    voiceStatus: 'idle' as 'idle' | 'recording' | 'processing',
    voiceText: '',
    recordTime: 0,
    recordTimer: null as any,
    recorderManager: null as any,
    maxRecordTime: 120 // 2分钟
  },

  onLoad(options: any) {
    const { mode = 'create', id } = options;
    const currentEditTaskId = id || ''; // 如果是创建模式，id 是任务ID

    this.setData({
      mode,
      productId: id ? parseInt(id) : 0,
      currentEditTaskId
    });

    if (mode === 'create') {
      this.loadUploadTaskData();
    } else {
      this.loadProductDetail(parseInt(id));
    }
  },

  onShow() {
    // 页面显示时的逻辑
  },

  onUnload() {
    // 页面卸载时清理录音资源
    this.stopRecording();
    this.stopRecordTimer();
  },

  /**
   * 加载上传任务数据
   */
  loadUploadTaskData() {
    try {
      const { currentEditTaskId } = this.data;
      if (!currentEditTaskId) {
        console.error('未找到任务ID');
        return;
      }

      const taskData = uploadTaskStorage.getTask(currentEditTaskId);
      if (!taskData) {
        console.error('未找到上传任务数据:', currentEditTaskId);
        return;
      }

      console.log('加载上传任务数据:', taskData);

      // 设置媒体列表（优先使用 images/videos 数组，兼容旧的 image 字段）
      const mediaList: MediaItem[] = [];

      // 如果有 images 数组，使用它
      if (taskData.images && taskData.images.length > 0) {
        taskData.images.forEach((url: string) => {
          mediaList.push({ type: 'image', url });
        });
      } else if (taskData.image) {
        // 兼容旧数据，使用 image 字段
        mediaList.push({ type: 'image', url: taskData.image });
      }

      // 如果有 videos 数组，添加到媒体列表
      if (taskData.videos && taskData.videos.length > 0) {
        taskData.videos.forEach((url: string) => {
          mediaList.push({ type: 'video', url });
        });
      }

      if (mediaList.length > 0) {
        this.setData({ mediaList });
      }

      // 映射任务数据到表单数据
      const formData = {
        title: taskData.title || '',
        price: taskData.price || 0,
        category: taskData.category || '',
        storeCode: taskData.storeCode || '',
        flowers: taskData.flowers || '',
        colorScheme: taskData.colorSeries || '',
        targetAudience: taskData.suitableFor ? taskData.suitableFor.join(', ') : '',
        quantity: taskData.quantity || 0,
        style: taskData.style || '',
        stock: taskData.stock || 0,
        status: 'active' as const
      };

      // 设置分类选择器索引
      let styleIndex = -1;
      if (formData.style) {
        styleIndex = this.data.styleOptions.indexOf(formData.style);
      }

      // 设置颜色选择器索引
      let colorIndex = -1;
      if (formData.colorScheme) {
        colorIndex = this.data.colorOptions.indexOf(formData.colorScheme);
      }

      // 处理适用人群：从逗号分隔的字符串更新选项的选中状态
      const selectedValues = formData.targetAudience
        ? formData.targetAudience.split(',').map((item: string) => item.trim()).filter((item: string) => item)
        : [];

      const targetAudienceOptions = this.data.targetAudienceOptions.map(option => ({
        ...option,
        selected: selectedValues.includes(option.value)
      }));

      this.setData({
        formData,
        styleIndex,
        colorIndex,
        targetAudienceOptions
      });

    } catch (error) {
      console.error('加载上传任务数据失败:', error);
    }
  },

  /**
   * 加载商品详情
   */
  async loadProductDetail(productId: number) {
    try {
      // TODO: 从服务器获取商品详情
      console.log('加载商品详情:', productId);

      // 模拟数据
      const mockData = {
        id: productId,
        title: '玫瑰花束',
        price: 299.00,
        style: '花束',
        storeCode: 'FB001',
        flowers: '玫瑰',
        colorScheme: '红色',
        targetAudience: '恋人',
        quantity: 11,
        category: '圆形花束',
        stock: 50,
        status: 'active',
        images: ['/assets/placeholder.jpg'],
        videos: []
      };

      const styleIndex = this.data.styleOptions.indexOf(mockData.style);
      const colorIndex = this.data.colorOptions.indexOf(mockData.colorScheme);

      // 处理适用人群：从逗号分隔的字符串更新选项的选中状态
      const selectedValues = mockData.targetAudience
        ? mockData.targetAudience.split(',').map((item: string) => item.trim()).filter((item: string) => item)
        : [];

      const targetAudienceOptions = this.data.targetAudienceOptions.map(option => ({
        ...option,
        selected: selectedValues.includes(option.value)
      }));

      const mediaList: MediaItem[] = [
        ...mockData.images.map(url => ({ type: 'image' as const, url })),
        ...mockData.videos.map(url => ({ type: 'video' as const, url }))
      ];

      this.setData({
        formData: mockData as ProductFormData,
        mediaList: mediaList as MediaItem[],
        styleIndex,
        colorIndex,
        targetAudienceOptions
      });
    } catch (error) {
      console.error('加载商品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 添加媒体文件
   */
  onAddMedia() {
    wx.showActionSheet({
      itemList: ['选择图片', '选择视频'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseImage();
        } else if (res.tapIndex === 1) {
          this.chooseVideo();
        }
      }
    });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseMedia({
      count: 9 - this.data.mediaList.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const currentMediaList = [...this.data.mediaList];

        // 先添加到列表（显示本地预览）
        const newMedia: MediaItem[] = res.tempFiles.map(file => ({
          type: 'image',
          url: file.tempFilePath,
          tempPath: file.tempFilePath
        }));

        const updatedMediaList = [...currentMediaList, ...newMedia];
        this.setData({
          mediaList: updatedMediaList
        });

        // 立即上传每个文件
        for (let i = 0; i < res.tempFiles.length; i++) {
          const file = res.tempFiles[i];
          const mediaIndex = currentMediaList.length + i;
          // 不等待，并行上传
          this.uploadMediaFile(file.tempFilePath, 'image', mediaIndex).catch(err => {
            console.error(`上传文件 ${i} 失败:`, err);
          });
        }
      }
    });
  },

  /**
   * 选择视频
   */
  chooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const file = res.tempFiles[0];
        const currentMediaList = [...this.data.mediaList];
        const mediaIndex = currentMediaList.length;

        // 先添加到列表（显示本地预览）
        const newMedia: MediaItem = {
          type: 'video',
          url: file.tempFilePath,
          tempPath: file.tempFilePath
        };

        this.setData({
          mediaList: [...currentMediaList, newMedia]
        });

        // 立即上传文件（不等待，异步执行）
        this.uploadMediaFile(file.tempFilePath, 'video', mediaIndex).catch(err => {
          console.error('上传视频失败:', err);
        });
      }
    });
  },

  /**
   * 删除媒体文件
   */
  onDeleteMedia(e: any) {
    const index = e.currentTarget.dataset.index;
    const mediaList = [...this.data.mediaList];
    mediaList.splice(index, 1);

    this.setData({ mediaList });

    // 如果是创建模式，同步更新到上传任务缓存
    if (this.data.mode === 'create' && this.data.currentEditTaskId) {
      this.syncMediaListToTask();
    }
  },

  /**
   * 上传媒体文件到七牛云
   */
  async uploadMediaFile(filePath: string, type: 'image' | 'video', mediaIndex: number) {
    try {
      // 获取上传token
      const { token, ossKey, domain } = await getQiniuToken('public');

      // 获取文件类型后缀
      const fileExtension = getFileExtension(filePath, type);
      const ossKeyWithExt = `${ossKey}.${fileExtension}`;

      // 上传到七牛云
      const uploadResult = await uploadToQiniu(filePath, {
        token,
        ossKey: ossKeyWithExt,
        domain
      });

      // 更新mediaList中的URL（使用带后缀的key）
      const finalKey = uploadResult.key || ossKeyWithExt;
      const fileUrl = `${domain}/${finalKey}`;

      const mediaList = [...this.data.mediaList];
      if (mediaList[mediaIndex]) {
        mediaList[mediaIndex] = {
          ...mediaList[mediaIndex],
          url: fileUrl,
          tempPath: undefined // 上传成功后清除临时路径
        };
        this.setData({ mediaList });

        // 如果是创建模式，同步更新到上传任务缓存
        if (this.data.mode === 'create' && this.data.currentEditTaskId) {
          this.syncMediaListToTask();
        }

        console.log('媒体文件上传成功:', fileUrl);
      }
    } catch (error: any) {
      console.error('媒体文件上传失败:', error);

      // 上传失败，从列表中移除该项
      const mediaList = [...this.data.mediaList];
      if (mediaList[mediaIndex]) {
        mediaList.splice(mediaIndex, 1);
        this.setData({ mediaList });

        wx.showToast({
          title: '上传失败，已移除',
          icon: 'none',
          duration: 2000
        });
      }
    }
  },

  /**
   * 同步媒体列表到上传任务缓存
   */
  syncMediaListToTask() {
    const { currentEditTaskId, mediaList } = this.data;
    if (!currentEditTaskId) return;

    try {
      const task = uploadTaskStorage.getTask(currentEditTaskId);
      if (!task) {
        console.error('未找到任务:', currentEditTaskId);
        return;
      }

      // 分离图片和视频
      const images = mediaList.filter(item => item.type === 'image').map(item => item.url);
      const videos = mediaList.filter(item => item.type === 'video').map(item => item.url);

      // 更新任务数据（保持 image 字段兼容，同时更新 images 和 videos 数组）
      const firstImage = images[0] || task.image;
      const updatedTask: UploadTask = {
        ...task,
        image: firstImage, // 主图（兼容旧数据）
        images: images.length > 0 ? images : undefined, // 图片数组
        videos: videos.length > 0 ? videos : undefined // 视频数组
      };

      uploadTaskStorage.updateTask(updatedTask);
      console.log('已同步媒体列表到上传任务缓存:', { images: images.length, videos: videos.length });
    } catch (error) {
      console.error('同步媒体列表失败:', error);
    }
  },

  /**
   * 切换输入模式（语音/文本）
   */
  onInputModeChange(e: any) {
    const checked = e.detail.value;
    const inputMode = checked ? 'text' : 'voice';
    storage.setItem(STORAGE_KEYS.INPUT_MODE, inputMode);
    this.setData({ inputMode });
  },

  /**
   * 文本输入框变化（文本输入模式）
   */
  onVoiceTextInput(e: any) {
    const value = e.detail.value;
    this.setData({ voiceText: value });
  },

  /**
   * 分析文本内容并填充表单（文本输入模式）
   */
  async onAnalyzeText() {
    const { voiceText } = this.data;
    if (!voiceText || !voiceText.trim()) {
      wx.showToast({
        title: '请输入要分析的内容',
        icon: 'none'
      });
      return;
    }

    // 调用AI结构化
    await this.analyzeAndFillForm(voiceText.trim());
  },

  /**
   * 切换适用人群选项
   */
  onTargetAudienceToggle(e: any) {
    const value = e.currentTarget.dataset.value;
    if (!value) {
      console.error('未获取到选项值');
      return;
    }

    const { targetAudienceOptions } = this.data;

    // 更新选项的选中状态
    const updatedOptions = targetAudienceOptions.map(option =>
      option.value === value
        ? { ...option, selected: !option.selected }
        : option
    );

    // 获取选中的值数组
    const selectedValues = updatedOptions.filter(opt => opt.selected).map(opt => opt.value);

    // 同步到 formData.targetAudience（逗号分隔的字符串）
    const targetAudienceStr = selectedValues.join(', ');

    // 更新数据
    this.setData({
      targetAudienceOptions: updatedOptions,
      'formData.targetAudience': targetAudienceStr
    });

    // 如果是创建模式，同步到缓存
    const { mode, currentEditTaskId } = this.data;
    if (mode === 'create' && currentEditTaskId) {
      this.syncToCurrentEditTask();
    }
  },

  onInputChange(e: any) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    const { mode, currentEditTaskId } = this.data;

    const newValue = field === 'price' || field === 'quantity' || field === 'stock'
      ? parseFloat(value) || 0
      : value;

    this.setData({
      [`formData.${field}`]: newValue
    });

    // 如果是创建模式且是从上传页面来的，同步更新缓存
    if (mode === 'create' && currentEditTaskId) {
      this.syncToCurrentEditTask();
    }
  },

  /**
   * 分类选择
   */
  onStyleChange(e: any) {
    const index = e.detail.value;
    const style = this.data.styleOptions[index];
    const { mode, currentEditTaskId } = this.data;

    this.setData({
      styleIndex: index,
      'formData.style': style
    });

    // 如果是创建模式且是从上传页面来的，同步更新缓存
    if (mode === 'create' && currentEditTaskId) {
      this.syncToCurrentEditTask();
    }
  },

  /**
   * 同步表单数据到上传任务缓存
   */
  syncToCurrentEditTask() {
    const { formData, currentEditTaskId } = this.data;
    if (!currentEditTaskId) return;

    try {
      const task = uploadTaskStorage.getTask(currentEditTaskId);
      if (!task) {
        console.error('未找到任务:', currentEditTaskId);
        return;
      }

      // 更新任务数据
      const updatedTask: UploadTask = {
        ...task,
        title: formData.title,
        price: formData.price,
        category: formData.category,
        storeCode: formData.storeCode,
        flowers: formData.flowers,
        colorSeries: formData.colorScheme,
        suitableFor: formData.targetAudience ? formData.targetAudience.split(',').map((f: string) => f.trim()) : [],
        quantity: formData.quantity,
        style: formData.style,
        stock: formData.stock
      };

      uploadTaskStorage.updateTask(updatedTask);
      console.log('已同步表单数据到上传任务缓存');
    } catch (error) {
      console.error('同步缓存失败:', error);
    }
  },

  /**
   * 色系选择
   */
  onColorChange(e: any) {
    const index = e.detail.value;
    const colorScheme = this.data.colorOptions[index];
    const { mode, currentEditTaskId } = this.data;

    this.setData({
      colorIndex: index,
      'formData.colorScheme': colorScheme
    });

    // 如果是创建模式且是从上传页面来的，同步更新缓存
    if (mode === 'create' && currentEditTaskId) {
      this.syncToCurrentEditTask();
    }
  },

  /**
   * 取消操作
   */
  onCancel() {
    wx.showModal({
      title: '确认取消',
      content: '取消后将丢失所有修改，确定要取消吗？',
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack();
        }
      }
    });
  },

  /**
   * 保存商品
   */
  async onSave() {
    // 表单验证
    if (!this.validateForm()) {
      return;
    }

    wx.showLoading({
      title: this.data.mode === 'create' ? '创建中...' : '保存中...'
    });

    try {
      // TODO: 上传媒体文件和保存商品数据
      await this.saveProduct();

      wx.hideLoading();
      wx.showToast({
        title: this.data.mode === 'create' ? '创建成功' : '保存成功',
        icon: 'success'
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.hideLoading();
      console.error('保存失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  /**
   * 表单验证
   */
  validateForm(): boolean {
    const { formData } = this.data;

    // 检查图片

    if (this.data.mediaList.length === 0) {
      wx.showToast({
        title: '请上传商品图片',
        icon: 'error'
      });
      return false;
    }

    if (!formData.title.trim()) {
      wx.showToast({
        title: '请输入商品标题',
        icon: 'error'
      });
      return false;
    }

    if (formData.price <= 0) {
      wx.showToast({
        title: '请输入正确的价格',
        icon: 'error'
      });
      return false;
    }

    if (!formData.style) {
      wx.showToast({
        title: '请选择商品款式',
        icon: 'error'
      });
      return false;
    }

    return true;
  },

  /**
   * 语音按钮点击处理
   */
  onVoiceButtonTap() {
    if (this.data.voiceStatus === 'recording') {
      // 停止录音
      this.stopRecording();
    } else {
      // 开始录音
      this.startRecording();
    }
  },

  /**
   * 开始录音
   */
  startRecording() {
    const recorderManager = wx.getRecorderManager();
    this.setData({ recorderManager });

    recorderManager.onStart(() => {
      console.log('开始录音');
      this.setData({
        voiceStatus: 'recording',
        recordTime: 0,
        voiceText: ''
      });
      this.startRecordTimer();
    });

    recorderManager.onStop((res: any) => {
      console.log('录音结束', res);
      this.stopRecordTimer();
      this.processAudioFile(res.tempFilePath);
    });

    recorderManager.onError((err: any) => {
      console.error('录音错误', err);
      this.setData({ voiceStatus: 'idle' });
      this.stopRecordTimer();
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      });
    });

    // 开始录音，最多2分钟
    recorderManager.start({
      duration: this.data.maxRecordTime * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    });
  },

  /**
   * 停止录音
   */
  stopRecording() {
    if (this.data.recorderManager) {
      this.data.recorderManager.stop();
    }
  },

  /**
   * 开始录音计时器
   */
  startRecordTimer() {
    this.stopRecordTimer();
    const timer = setInterval(() => {
      const newTime = this.data.recordTime + 1;
      if (newTime >= this.data.maxRecordTime) {
        // 达到最大时间，自动停止
        this.stopRecording();
      } else {
        this.setData({ recordTime: newTime });
      }
    }, 1000);
    this.setData({ recordTimer: timer });
  },

  /**
   * 停止录音计时器
   */
  stopRecordTimer() {
    if (this.data.recordTimer) {
      clearInterval(this.data.recordTimer);
      this.setData({ recordTimer: null });
    }
  },

  /**
   * 处理录音文件，调用AI转文本
   */
  async processAudioFile(_filePath: string) {
    this.setData({ voiceStatus: 'processing' });

    try {
      // 调用豆包AI转文本
      const text = await this.transcribeAudio(_filePath);
      // const text = '仙子之吻玫瑰花束，粉玫瑰，10朵，圆形花束，适合送给恋人';

      // 显示识别结果
      this.setData({ voiceText: text });

      // 语音识别完成后，自动切换到文本输入模式
      this.setData({ inputMode: 'text' });

      // 自动调用AI结构化
      await this.analyzeAndFillForm(text);

    } catch (error: any) {
      console.error('处理音频失败:', error);
      this.setData({ voiceStatus: 'idle' });
      wx.showToast({
        title: error.message || '处理失败',
        icon: 'none'
      });
    }
  },

  /**
   * 调用豆包AI进行语音转文本
   */
  async transcribeAudio(filePath: string): Promise<string> {
    const response = await transcribeVoice(filePath);

    if (!response.success) {
      throw new Error(response.message);
    }

    return response.data.text;
  },

  /**
   * AI分析并填充表单
   */
  async analyzeAndFillForm(text: string) {
    try {
      this.setData({ voiceStatus: 'processing' });

      // 调用AI结构化接口
      const response = await analyzeVoiceText(text);

      if (!response.success) {
        throw new Error(response.message);
      }

      const analysis = response.data.analysis;

      // 自动填充表单
      const formData = {
        ...this.data.formData,
        title: analysis.product_title || this.data.formData.title,
        style: analysis.style || this.data.formData.style,
        flowers: analysis.flowers ? analysis.flowers.join(', ') : this.data.formData.flowers,
        colorScheme: analysis.color_series || this.data.formData.colorScheme,
        price: analysis.price || this.data.formData.price,
        quantity: analysis.quantity || this.data.formData.quantity,
      };

      // 设置分类选择器索引
      let styleIndex = -1;
      if (formData.style) {
        styleIndex = this.data.styleOptions.indexOf(formData.style);
      }

      // 设置颜色选择器索引
      let colorIndex = -1;
      if (formData.colorScheme) {
        colorIndex = this.data.colorOptions.indexOf(formData.colorScheme);
      }

      this.setData({
        formData,
        styleIndex,
        colorIndex,
        voiceStatus: 'idle'
      });

      wx.showToast({
        title: 'AI分析完成，表单已填充',
        icon: 'success'
      });

    } catch (error: any) {
      console.error('AI分析失败:', error);
      this.setData({ voiceStatus: 'idle' });
      wx.showToast({
        title: error.message || 'AI分析失败',
        icon: 'none'
      });
    }
  },

  /**
   * 保存商品数据
   */
  async saveProduct() {
    const { formData, mediaList, mode, productId } = this.data;

    // 数据验证
    if (!formData.title || !formData.title.trim()) {
      wx.showToast({
        title: '请输入商品标题',
        icon: 'none'
      });
      return;
    }

    if (mediaList.length === 0) {
      wx.showToast({
        title: '请至少上传一张图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: mode === 'create' ? '创建中...' : '保存中...'
    });

    try {
      // 保存前最后一次同步媒体列表到任务缓存（如果是创建模式）
      if (mode === 'create' && this.data.currentEditTaskId) {
        this.syncMediaListToTask();
      }

      // 准备提交的数据
      const submitData = {
        title: formData.title,
        price: formData.price,
        category: formData.category || formData.style || '其他',
        storeCode: formData.storeCode,
        flowers: formData.flowers,
        colorScheme: formData.colorScheme,
        targetAudience: formData.targetAudience,
        quantity: formData.quantity,
        style: formData.style,
        stock: formData.stock || 0,
        status: formData.status || 'active',
        mediaList: mediaList.map(item => ({
          type: item.type,
          url: item.url
        })),
        // 如果使用了快速录入，将原始文本存储到 remark
        remark: this.data.voiceText && this.data.voiceText.trim() ? this.data.voiceText.trim() : undefined
      };

      let result;
      if (mode === 'create') {
        // 创建商品
        result = await createProduct(submitData);
      } else {
        // 更新商品
        if (!productId || productId === 0) {
          throw new Error('商品ID不能为空');
        }
        result = await updateProduct(productId.toString(), submitData);
      }

      if (result.success) {
        wx.showToast({
          title: mode === 'create' ? '创建成功' : '保存成功',
          icon: 'success'
        });

        // 如果是创建模式，从上传任务列表中移除该任务
        if (mode === 'create') {
          const { currentEditTaskId } = this.data;
          if (currentEditTaskId) {
            // 从上传任务列表中移除该任务
            uploadTaskStorage.removeTask(currentEditTaskId);
            console.log('已从上传任务列表中移除任务:', currentEditTaskId);
          }
        }

        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(result.message || '保存失败');
      }
    } catch (error: any) {
      console.error('保存商品失败:', error);
      wx.showToast({
        title: error.message || '保存失败，请稍后重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  }
})