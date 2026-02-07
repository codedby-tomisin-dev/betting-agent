import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export interface NotificationsResponse {
    notifications: Notification[];
}

/**
 * Fetch user notifications
 */
export const getUserNotifications = async (): Promise<NotificationsResponse> => {
    const getUserNotificationsFn = httpsCallable<void, NotificationsResponse>(functions, 'user_notifications');
    const result = await getUserNotificationsFn();
    return result.data;
};
