'use client';

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { Card } from '@/components/ui/Card';

interface ChartData {
  date: string;
  avgUptime: number;
  activeValidators: number;
  totalStaked: number;
}

export function ValidatorPerformanceChart() {
  const data: ChartData[] = useMemo(() => {
    const now = Date.now();
    const days = 7;
    
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - 1 - i) * 24 * 60 * 60 * 1000);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgUptime: parseFloat((99 + Math.random() * 0.8).toFixed(2)),
        activeValidators: Math.floor(93 + Math.random() * 5),
        totalStaked: parseFloat((95 + Math.random() * 5).toFixed(1)),
      };
    });
  }, []);

  return (
    <Card className="p-4">
      <h4 className="mb-4 text-sm font-semibold">Validator Performance (7 Days)</h4>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              domain={[98.5, 100]}
              className="text-xs"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="avgUptime"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorUptime)"
              name="Avg Uptime"
              unit="%"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="activeValidators"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Active Validators"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#8884d8]" />
          <span>Avg Uptime</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[#82ca9d]" />
          <span>Active Validators</span>
        </div>
      </div>
    </Card>
  );
}
