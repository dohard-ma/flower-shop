# wx 消息订阅-技术实现方案

## 涉及表

1. 用户表

- alwaysAllowSubscriptionKeys // 用于允许一直有权限的订阅消息模版id，json 格式，默认为 []
- allowSubscription // 是否开启接收通知，默认 true

注：移除 subscriptionEnabled,subscriptionCount,lastSubscriptionTime,alwaysAllowSubscription

1. 通知场景表（在哪些场景，请求什么通知模版的权限，暂时不需要）

2. 通知模板表（对应 wx 后台的通知模版，暂时不需要，先写死）

3. 订阅权限表

- 用户id
- 通知模版id
- 可用通知次数

5. 通知发送记录表（用于记录是否通知成功，来反馈运营是否需要人工再次通知）

- 通知模版id
- 通知状态（是否通知成功）
- 通知时间
- 通知内容（json）
- 错误信息

## 处理逻辑

### 静默获取通知授权

1. 用户进入小程序，获取用户允许的通知消息模版
   1. 通过 [wx.getSetting](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/setting/wx.getSetting.html) 判断是否允许获取通知授权
      1. 获取用户允许的通知消息模版，更新用户表内的 alwaysAllowSubscriptionKeys 字段
2. 在用户点击事件里，静默获取通知次数
   1. 只静默获取 alwaysAllowSubscriptionKeys 中包含的模版id
      1. 获取成功，则更新订阅权限表中对应模版id的可用通知次数

### 弹窗获取通知授权

1. 用户支付成功、领取成功、赠送成功等关键步骤，弹窗提示用户需要获取通知权限
   1. 用户点击允许，则请求 [wx.requestSubscribeMessage](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html) 获取通知授权
      1. 获取成功，则更新订阅权限表中对应模版id的可用通知次数
         1. 更新用户表内的 alwaysAllowSubscriptionKeys 字段，将当前模版id添加到 alwaysAllowSubscriptionKeys 中
      2. 获取失败，则不更新订阅权限表中对应模版id的可用通知次数
   2. 用户点击不允许，则不更新订阅权限表中对应模版id的可用通知次数

## 其他

- wx.requestSubscribeMessage 要直接在点击事件里调用，不能放在 promise then 里调用
- wx.requestSubscribeMessage 只允许通过点击事件获取，不能在 onLoad 里调用
  - errMsg:"requestSubscribeMessage:fail can only be invoked by user TAP gesture."
  - errMsg:"requestSubscribeMessage:fail last call has not ended"
- wx.requestSubscribeMessage 返回错误码：[TEMPLATE_ID]是动态的键，即模板id，值包括'accept'、'reject'、'ban'、'filter'。'accept'表示用户同意订阅该条id对应的模板消息，'reject'表示用户拒绝订阅该条id对应的模板消息，'ban'表示已被后台封禁，'filter'表示该模板因为模板标题同名被后台过滤。例如 { errMsg: "requestSubscribeMessage:ok", zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE: "accept"} 表示用户同意订阅zun-LzcQyW-edafCVvzPkK4de2Rllr1fFpw2A_x0oXE这条消息
- 总开关状态：通过wx.getSetting获取的subscriptionsSetting.mainSwitch判断
- 模板授权状态：通过subscriptionsSetting.itemSettings判断具体模板是否被授权
