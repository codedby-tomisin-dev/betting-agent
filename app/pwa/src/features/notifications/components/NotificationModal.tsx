"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, X } from "lucide-react";
import { getUserNotifications } from "@/shared/api/notificationsApi";
import { Notification } from "@/shared/api/notificationsApi";
import { formatDistanceToNow } from "date-fns";

interface NotificationModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function NotificationModal({ isOpen, onOpenChange }: NotificationModalProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getUserNotifications();
            // Default to empty array if response or notifications is missing
            setNotifications(response?.notifications || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
            setError("Failed to load notifications");
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-white">
                <DialogHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Bell className="h-5 w-5 text-gray-600" />
                        Notifications
                    </DialogTitle>
                    {/* Close button is automatically added by DialogContent usually, but ensure spacing */}
                </DialogHeader>

                <div className="flex flex-col h-[500px]">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-sm">Loading notifications...</p>
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-red-400 p-4 text-center">
                            <p className="mb-2">Unable to load notifications</p>
                            <Button variant="outline" size="sm" onClick={fetchNotifications}>
                                Retry
                            </Button>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                            <Bell className="h-12 w-12 mb-3 opacity-20" />
                            <p className="text-lg font-medium text-gray-900 mb-1">No notifications</p>
                            <p className="text-sm">We'll notify you when there's an update on your bets.</p>
                        </div>
                    ) : (
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                {notification.title}
                                            </h4>
                                            {notification.timestamp && (
                                                <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                                    {(() => {
                                                        try {
                                                            return formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
                                                        } catch (e) {
                                                            return '';
                                                        }
                                                    })()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 line-clamp-2">{notification.message}</p>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
