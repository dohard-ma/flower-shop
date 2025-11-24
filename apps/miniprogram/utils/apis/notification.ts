import { request } from './index';

// const response = await new Promise<any>((resolve, reject) => {
//     wx.request({
//         url: `${API_BASE_URL.replace('/api/wx', '')}/api/wx/notification/config`,
//         method: 'GET',
//         header: {
//             'Content-Type': 'application/json'
//         },
//         success: resolve,
//         fail: reject
//     });
// });

export const getNotificationConfig = async () => {
    return await request({
        url: '/notification/config',
        method: 'GET',
    })
}