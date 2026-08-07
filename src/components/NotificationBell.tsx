import { Bell, Mail, Phone, MapPin, Package, Check } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className={`p-3 hover:bg-muted/50 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => !n.is_read && markNotificationRead(n.id)}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Package className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{n.item_title}</span>
                        {!n.is_read && <Badge className="text-[10px] h-4 px-1.5">New</Badge>}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                    </div>
                  </div>
                  <div className="ml-6 space-y-1 text-xs bg-card border rounded-md p-2">
                    <div className="font-medium">{n.finder_username}</div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${n.finder_email}`} className="hover:text-primary truncate">{n.finder_email}</a>
                    </div>
                    {n.finder_phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <a href={`tel:${n.finder_phone}`} className="hover:text-primary">{n.finder_phone}</a>
                      </div>
                    )}
                    {n.finder_location && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{n.finder_location}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 ml-6">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    {n.item_id && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                        <Link to={`/items/${n.item_id}`}>View item</Link>
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}