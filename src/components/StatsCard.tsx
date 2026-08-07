import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
}

export default function StatsCard({ title, value, icon: Icon, color = 'text-primary' }: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`p-3 rounded-xl bg-primary/10 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-display font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
