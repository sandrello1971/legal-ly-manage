import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Archive,
  ExternalLink
} from 'lucide-react';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

interface DashboardAlertsProps {
  className?: string;
}

export function DashboardAlerts({ className }: DashboardAlertsProps) {
  const { notifications, markAsRead, archiveNotification, getUnreadCount } = useNotifications();

  // Get recent unread notifications (last 5)
  const recentNotifications = notifications
    .filter(n => !n.is_read && !n.is_archived)
    .slice(0, 5);

  // Get high priority notifications
  const urgentNotifications = notifications
    .filter(n => !n.is_archived && (n.priority === 'urgent' || n.priority === 'high'))
    .slice(0, 3);

  const getNotificationIcon = (type: Notification['type'], priority: Notification['priority']) => {
    const iconClass = `h-4 w-4 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-blue-500' :
      'text-gray-500'
    }`;

    switch (type) {
      case 'expense_approved':
      case 'expense_processed':
      case 'reconciliation_completed':
        return <CheckCircle className={iconClass} />;
      case 'expense_rejected':
      case 'anomaly_detected':
        return <AlertTriangle className={iconClass} />;
      case 'budget_alert':
      case 'project_deadline':
        return <TrendingUp className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return notificationDate.toLocaleDateString();
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  if (getUnreadCount() === 0 && urgentNotifications.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="h-8 w-8 text-success mb-2" />
            <p className="text-sm text-muted-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground">No new alerts or notifications</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts & Notifications
          </div>
          {getUnreadCount() > 0 && (
            <Badge variant="destructive" className="h-5 px-2 text-xs">
              {getUnreadCount()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Urgent Notifications */}
        {urgentNotifications.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Priority Alerts</span>
            </div>
            <div className="space-y-2">
              {urgentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-2 rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                            {notification.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      {notification.action_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {urgentNotifications.length > 0 && recentNotifications.length > 0 && (
          <Separator />
        )}

        {/* Recent Notifications */}
        {recentNotifications.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Recent</span>
            </div>
            <div className="space-y-2">
              {recentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                      </div>
                      {notification.action_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Bell className="h-3 w-3 mr-1" />
            View All
          </Button>
          {getUnreadCount() > 5 && (
            <Button variant="ghost" size="sm">
              <Archive className="h-3 w-3 mr-1" />
              Archive Old
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}