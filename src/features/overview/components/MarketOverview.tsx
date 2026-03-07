'use client';

import { motion } from 'framer-motion';
import { TrendingUp, PieChart as PieChartIcon, Activity } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { formatNumber } from '@/shared/utils';

interface MarketShareData {
  name: string;
  value: number;
  color: string;
}

interface TVLData {
  timestamp: string;
  value: number;
}

interface ActivityData {
  date: string;
  updates: number;
  activeFeeds: number;
}

interface MarketOverviewProps {
  marketShare: MarketShareData[];
  tvlTrend: TVLData[];
  activityData: ActivityData[];
  isLoading?: boolean;
}

export function MarketOverview({
  marketShare,
  tvlTrend,
  activityData,
  isLoading,
}: MarketOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-muted/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Market Share Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:col-span-1"
      >
        <ChartCard
          title="Market Share"
          icon={<PieChartIcon className="h-4 w-4" />}
          description="TVL distribution by protocol"
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {marketShare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.value.toFixed(1)}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {marketShare.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground">
                  {item.name} {item.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </motion.div>

      {/* TVL Trend Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <ChartCard
          title="TVL Trend"
          icon={<TrendingUp className="h-4 w-4" />}
          description="Total Value Locked over time"
        >
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tvlTrend}>
                <defs>
                  <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getHours()}:00`;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  tickFormatter={(value) => `$${(value / 1e9).toFixed(1)}B`}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2 shadow-lg">
                          <p className="mb-1 text-xs text-muted-foreground">
                            {new Date(label as string).toLocaleString()}
                          </p>
                          <p className="font-medium">
                            ${formatNumber(payload[0].value as number, 0)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#tvlGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </motion.div>

      {/* Activity Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="lg:col-span-3"
      >
        <ChartCard
          title="On-Chain Activity"
          icon={<Activity className="h-4 w-4" />}
          description="Daily updates and active feeds"
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#64748B', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length && label) {
                      return (
                        <div className="rounded-lg border border-border bg-popover p-2 shadow-lg">
                          <p className="mb-1 text-xs text-muted-foreground">
                            {new Date(label as string).toLocaleDateString()}
                          </p>
                          {payload.map((item, index) => (
                            <p
                              key={index}
                              className="text-sm"
                              style={{ color: item.color as string }}
                            >
                              {item.name}: {formatNumber(item.value as number, 0)}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="updates"
                  name="Updates"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="right"
                  dataKey="activeFeeds"
                  name="Active Feeds"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </motion.div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

function ChartCard({ title, icon, description, children }: ChartCardProps) {
  return (
    <div className="h-full rounded-xl border border-border/30 bg-background/30 p-5 backdrop-blur-sm transition-all duration-300 hover:border-border/50">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
