import client from './client'

export const authApi = {
  register: (email, password, fullName, deviceFingerprint) =>
    client.post('/auth/register', { email, password, full_name: fullName, device_fingerprint: deviceFingerprint }),
  login: (email, password) =>
    client.post('/auth/login', { email, password }),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
}

export const calculatorApi = {
  checkTrial: (deviceFingerprint, platform = 'android') =>
    client.post('/calculator/check-trial', { device_fingerprint: deviceFingerprint, platform }),
  recordUse: (data) =>
    client.post('/calculator/record-use', data),
  getHistory: () => client.get('/calculator/history'),
}

export const subscriptionsApi = {
  createCheckout: (plan) =>
    client.post('/subscriptions/create-checkout', { plan }),
  getStatus: () => client.get('/subscriptions/status'),
}

export const aiApi = {
  chat: (message, history = []) =>
    client.post('/ai/assistant', { message, conversation_history: history }),
  stackCheck: (peptides) =>
    client.post('/ai/stack-check', { peptides }),
}
