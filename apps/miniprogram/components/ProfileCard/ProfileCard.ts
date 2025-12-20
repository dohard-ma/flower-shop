Component({
  properties: {
    userInfo: {
      type: Object,
      value: {
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie',
        badge: '🌿',
        nickname: '爱种花的林小姐',
        level: 'L2',
        userId: '8859 2034'
      }
    },
    levelInfo: {
      type: Object,
      value: {
        title: 'L2 高级花友',
        current: 1280,
        total: 2000,
        percent: 65
      }
    }
  },

  methods: {
    onEdit() {
      this.triggerEvent('edit')
    }
  }
})
