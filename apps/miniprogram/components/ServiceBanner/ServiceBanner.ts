Component({
  properties: {
    icon: {
      type: String,
      value: '💬'
    },
    title: {
      type: String,
      value: '联系专属花艺师'
    },
    description: {
      type: String,
      value: '获取每日鲜花讯息 · 1对1选花指导'
    },
    buttonText: {
      type: String,
      value: '去添加'
    }
  },

  methods: {
    onContact() {
      this.triggerEvent('contact')
    }
  }
})
