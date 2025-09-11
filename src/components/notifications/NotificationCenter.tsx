import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Bell, 
  BellOff, 
  Search, 
  Filter, 
  Archive, 
  ArchiveRestore,
  Trash2,
  CheckCircle,
  CircleDot,
  AlertTriangle,
  Info,
  TrendingUp,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications, type Notification } from '@/hooks/useNotifications';

export function NotificationCenter() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('unread');
  const {
    notifications,
    loading,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    archiveNotification,
    unarchiveNotification,
    deleteNotification,
    getUnreadCount,
    getArchivedCount
  } = useNotifications();

  // Filter notifications based on current tab and filters
  const filteredNotifications = notifications.filter(notification => {
    // Tab filter
    let tabMatch = true;
    switch (activeTab) {
      case 'unread':
        tabMatch = !notification.is_read && !notification.is_archived;
        break;
      case 'all':
        tabMatch = !notification.is_archived;
        break;
      case 'archived':
        tabMatch = notification.is_archived;
        break;
    }

    // Search filter
    const searchMatch = searchTerm === '' || 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    // Type filter
    const typeMatch = typeFilter === 'all' || notification.type === typeFilter;

    // Priority filter
    const priorityMatch = priorityFilter === 'all' || notification.priority === priorityFilter;

    return tabMatch && searchMatch && typeMatch && priorityMatch;
  });

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
        return <CheckCircle className={iconClass} />;
      case 'expense_rejected':
      case 'anomaly_detected':
        return <AlertTriangle className={iconClass} />;
      case 'budget_alert':
      case 'project_deadline':
        return <TrendingUp className={iconClass} />;
      default:
        return <Info className={iconClass} />;
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

  const getTypeLabel = (type: Notification['type']) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {getUnreadCount() > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {getUnreadCount()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Center
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                disabled={getUnreadCount() === 0}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="expense_processed">Expenses</SelectItem>
                <SelectItem value="statement_processed">Banking</SelectItem>
                <SelectItem value="project_deadline">Projects</SelectItem>
                <SelectItem value="budget_alert">Budget</SelectItem>
                <SelectItem value="anomaly_detected">Anomalies</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unread" className="relative">
                Unread
                {getUnreadCount() > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {getUnreadCount()}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="archived" className="relative">
                Archived
                {getArchivedCount() > 0 && (
                  <Badge variant="outline" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                    {getArchivedCount()}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Loading notifications...</div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BellOff className="h-12 w-12 text-muted-foreground mb-2" />
                    <div className="text-muted-foreground">
                      {activeTab === 'unread' ? 'No unread notifications' :
                       activeTab === 'archived' ? 'No archived notifications' :
                       'No notifications found'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredNotifications.map((notification) => (
                      <Card 
                        key={notification.id} 
                        className={`p-3 transition-colors hover:bg-muted/50 ${
                          !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type, notification.priority)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-sm">{notification.title}</h4>
                                  <Badge variant={getPriorityColor(notification.priority)} className="text-xs">
                                    {notification.priority}
                                  </Badge>
                                  {!notification.is_read && (
                                    <CircleDot className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{getTypeLabel(notification.type)}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(notification.created_at)}</span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {notification.is_read ? (
                                    <DropdownMenuItem
                                      onClick={() => markAsUnread(notification.id)}
                                    >
                                      <CircleDot className="h-4 w-4 mr-2" />
                                      Mark as unread
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => markAsRead(notification.id)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  {notification.is_archived ? (
                                    <DropdownMenuItem
                                      onClick={() => unarchiveNotification(notification.id)}
                                    >
                                      <ArchiveRestore className="h-4 w-4 mr-2" />
                                      Unarchive
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => archiveNotification(notification.id)}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {notification.action_url && notification.action_label && (
                              <div className="mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.location.href = notification.action_url!}
                                >
                                  {notification.action_label}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}