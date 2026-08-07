import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Package, Search, Eye, Trash2, MapPin, Check, X, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import { Item, Profile, Claim } from '@/types';

interface ClaimWithDetails extends Claim {
  itemTitle?: string;
  claimantName?: string;
  claimantEmail?: string;
}

export default function AdminDashboard() {
  const { profile, items, claimsForReview, deleteItem, reviewClaim } = useApp();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [allItemsAdmin, setAllItemsAdmin] = useState<Item[]>([]);
  const [enrichedClaims, setEnrichedClaims] = useState<ClaimWithDetails[]>([]);

  useEffect(() => {
    if (!profile) { navigate('/login'); return; }
    if (profile.role !== 'admin') { navigate('/'); return; }

    // Admin sees everything via RLS
    supabase.from('profiles').select('*').then(({ data }) => setAllUsers((data as any) ?? []));
    supabase.from('items').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setAllItemsAdmin((data as Item[]) ?? []));
  }, [profile, navigate]);

  // Enrich claims with item title + claimant info for the review UI
  useEffect(() => {
    const enrich = async () => {
      const enriched: ClaimWithDetails[] = await Promise.all(
        claimsForReview.map(async (c) => {
          const [{ data: it }, { data: cl }] = await Promise.all([
            supabase.from('items').select('title').eq('id', c.found_item_id).maybeSingle(),
            supabase.from('profiles').select('username, email').eq('user_id', c.claimant_id).maybeSingle(),
          ]);
          return {
            ...c,
            itemTitle: (it as any)?.title,
            claimantName: (cl as any)?.username,
            claimantEmail: (cl as any)?.email,
          };
        })
      );
      setEnrichedClaims(enriched);
    };
    if (claimsForReview.length) enrich();
    else setEnrichedClaims([]);
  }, [claimsForReview]);

  if (!profile || profile.role !== 'admin') return null;

  const lostCount = allItemsAdmin.filter(i => i.type === 'lost').length;
  const foundCount = allItemsAdmin.filter(i => i.type === 'found').length;
  const pendingClaims = enrichedClaims.filter(c => c.status === 'pending');

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <h1 className="font-display text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatsCard title="Total Users" value={allUsers.length} icon={Users} />
          <StatsCard title="Total Items" value={allItemsAdmin.length} icon={Package} />
          <StatsCard title="Lost Items" value={lostCount} icon={Search} color="text-lost" />
          <StatsCard title="Found Items" value={foundCount} icon={Eye} color="text-found" />
        </div>

        {/* Claim review section */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              Pending Claim Reviews
              {pendingClaims.length > 0 && (
                <Badge className="bg-primary text-primary-foreground">{pendingClaims.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending claims to review.</p>
            ) : pendingClaims.map(c => (
              <div key={c.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link to={`/items/${c.found_item_id}`} className="font-semibold hover:text-primary">
                      {c.itemTitle ?? 'Item'}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      Claimed by <span className="font-medium text-foreground">{c.claimantName}</span> ({c.claimantEmail})
                    </p>
                    {c.message && <p className="text-sm mt-2 italic">"{c.message}"</p>}
                  </div>
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => reviewClaim(c.id, 'approved')}>
                    <Check className="h-4 w-4 mr-1" /> Approve & notify
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reviewClaim(c.id, 'rejected')}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader><CardTitle className="font-display">Recent Reports</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {allItemsAdmin.slice(0, 6).map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      <Badge className={`shrink-0 text-xs ${item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}`}>
                        {item.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />{item.location} · {item.date}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/items/${item.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display">Registered Users</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {allUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium text-sm">{u.username}</span>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}