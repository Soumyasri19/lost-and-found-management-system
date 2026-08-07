import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package, MapPin, Eye, Clock, CheckCircle2, XCircle, Bell, Mail, Phone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import { Item } from '@/types';

export default function UserDashboard() {
  const { profile, myClaims, deleteItem, notifications, markNotificationRead } = useApp();
  const navigate = useNavigate();
  const [myItems, setMyItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!profile) { navigate('/login'); return; }
    // Fetch directly from items table — RLS lets owner see their own (incl. lost)
    supabase
      .from('items')
      .select('*')
      .eq('user_id', profile.user_id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setMyItems((data as Item[]) ?? []));
  }, [profile, navigate]);

  if (!profile) return null;

  const lostCount = myItems.filter(i => i.type === 'lost').length;
  const foundCount = myItems.filter(i => i.type === 'found').length;

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setMyItems(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {profile.username}</p>
          </div>
          <Button asChild>
            <Link to="/report"><Plus className="h-4 w-4 mr-2" /> Report Item</Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mb-10">
          <StatsCard title="Total Reports" value={myItems.length} icon={Package} />
          <StatsCard title="Lost Items" value={lostCount} icon={Package} color="text-lost" />
          <StatsCard title="Found Items" value={foundCount} icon={Package} color="text-found" />
        </div>

        <h2 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notifications
          {notifications.filter(n => !n.is_read).length > 0 && (
            <Badge className="bg-destructive text-destructive-foreground">
              {notifications.filter(n => !n.is_read).length} new
            </Badge>
          )}
        </h2>
        {notifications.length === 0 ? (
          <p className="text-muted-foreground mb-10">No notifications yet. You'll see finder contact details here when an admin approves a match.</p>
        ) : (
          <div className="space-y-3 mb-10">
            {notifications.map(n => (
              <Card key={n.id} className={!n.is_read ? 'border-primary/40 bg-primary/5' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{n.item_title}</span>
                        {!n.is_read && <Badge className="text-xs">New</Badge>}
                      </div>
                      {n.message && <p className="text-sm text-muted-foreground mt-1">{n.message}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && (
                        <Button variant="ghost" size="sm" onClick={() => markNotificationRead(n.id)}>
                          Mark read
                        </Button>
                      )}
                      {n.item_id && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/items/${n.item_id}`}>View item</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-md border bg-card p-3 grid sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Contact name</div>
                      <div className="font-medium">{n.finder_username}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-0.5">Email</div>
                      <a href={`mailto:${n.finder_email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                        <Mail className="h-3 w-3" />{n.finder_email}
                      </a>
                    </div>
                    {n.finder_phone && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Phone</div>
                        <a href={`tel:${n.finder_phone}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" />{n.finder_phone}
                        </a>
                      </div>
                    )}
                    {n.finder_location && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Location</div>
                        <div className="font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{n.finder_location}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h2 className="font-display text-xl font-semibold mb-4">My Reports</h2>
        {myItems.length === 0 ? (
          <p className="text-muted-foreground mb-10">You haven't reported any items yet.</p>
        ) : (
          <div className="space-y-4 mb-10">
            {myItems.map(item => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="h-12 w-12 object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{item.title}</span>
                        <Badge className={`shrink-0 text-xs ${item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}`}>
                          {item.type}
                        </Badge>
                        {item.is_resolved && <Badge className="bg-found text-found-foreground text-xs">Resolved</Badge>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{item.location} · {item.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/items/${item.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <h2 className="font-display text-xl font-semibold mb-4">My Claims</h2>
        {myClaims.length === 0 ? (
          <p className="text-muted-foreground">You haven't submitted any claims.</p>
        ) : (
          <div className="space-y-3">
            {myClaims.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.status === 'pending' && <Clock className="h-5 w-5 text-primary" />}
                    {c.status === 'approved' && <CheckCircle2 className="h-5 w-5 text-found" />}
                    {c.status === 'rejected' && <XCircle className="h-5 w-5 text-destructive" />}
                    <div>
                      <div className="text-sm font-medium capitalize">{c.status}</div>
                      <div className="text-xs text-muted-foreground">Submitted {new Date(c.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/items/${c.found_item_id}`}>View item</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}