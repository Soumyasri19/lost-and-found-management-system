import { Item } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ItemCard({ item }: { item: Item }) {
  return (
    <Link to={`/items/${item.id}`}>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="relative h-44 bg-muted flex items-center justify-center overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <Package className="h-12 w-12 text-muted-foreground/40" />
          )}
          <Badge className={`absolute top-3 left-3 ${item.type === 'lost' ? 'bg-lost text-lost-foreground' : 'bg-found text-found-foreground'}`}>
            {item.type === 'lost' ? 'Lost' : 'Found'}
          </Badge>
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-display font-semibold text-lg truncate group-hover:text-primary transition-colors">{item.title}</h3>
          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
          <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{item.date}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
