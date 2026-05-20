import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { authApi } from '../api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications() {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'bd04fdc6-6f65-49c5-8881-65180866aa5c',
    });
    await authApi.setPushToken(token);
  } catch (err) {
    console.warn('[Notifications] Registration failed:', err?.message);
  }
}
