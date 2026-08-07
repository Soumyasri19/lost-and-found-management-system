import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/types';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';
import { Search } from 'lucide-react';

export default function AllItems() {
  const { items, profile } = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return items.filter(i => {
      // Privacy guard (defense-in-depth; RLS already enforces this server-side)
      const visible = i.type === 'found' || i.user_id === profile?.user_id || profile?.role === 'admin';
      if (!visible) return false;
      const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || i.type === typeFilter;
      const matchCat = catFilter === 'all' || i.category === catFilter;
      return matchSearch && matchType && matchCat;
    });
  }, [items, search, typeFilter, catFilter, profile]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <h1 className="font-display text-3xl font-bold mb-2">Browse Found Items</h1>
        <p className="text-muted-foreground mb-8">
          {profile ? 'Lost items are private — only the owner and admins can see them. See your own lost reports in your dashboard.' : 'Sign in to claim a found item or report a lost one.'}
        </p>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search items..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="found">Found</SelectItem>
            </SelectContent>
          </Select>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No items found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
}
