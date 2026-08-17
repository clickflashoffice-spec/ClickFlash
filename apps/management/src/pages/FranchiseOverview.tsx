import { useEffect, useState } from 'react';
import { Card, Title, Text, Grid, Metric, Flex, BadgeDelta, BarChart } from '@tremor/react';

interface TenantStats {
  id: string;
  name: string;
  region: string;
  totalRevenue: number;
  totalOrders: number;
  activePhotographers: number;
}

export function FranchiseOverview() {
  const [stats, setStats] = useState<TenantStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetch for Franchise stats
    setTimeout(() => {
      setStats([
        { id: '1', name: 'ClickFlash Orlando', region: 'AMER', totalRevenue: 154000, totalOrders: 4200, activePhotographers: 45 },
        { id: '2', name: 'ClickFlash Paris', region: 'EU', totalRevenue: 98000, totalOrders: 2800, activePhotographers: 32 },
        { id: '3', name: 'ClickFlash Tokyo', region: 'APAC', totalRevenue: 210000, totalOrders: 5800, activePhotographers: 60 }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const totalGlobalRevenue = stats.reduce((acc, curr) => acc + curr.totalRevenue, 0);

  const chartData = stats.map(s => ({
    name: s.name,
    'Revenue (USD)': s.totalRevenue
  }));

  if (loading) return <div>Loading Franchise Data...</div>;

  return (
    <div className="p-6">
      <Title>Global Franchise Overview</Title>
      <Text>Real-time telemetry across all ClickFlash theme park tenants.</Text>
      
      <Grid numItemsSm={2} numItemsLg={3} className="gap-6 mt-6">
        <Card>
          <Text>Global Gross Revenue</Text>
          <Metric>${totalGlobalRevenue.toLocaleString()}</Metric>
          <Flex className="mt-4">
            <Text>vs last month</Text>
            <BadgeDelta deltaType="increase">+12.5%</BadgeDelta>
          </Flex>
        </Card>
        <Card>
          <Text>Active Global Franchises</Text>
          <Metric>{stats.length}</Metric>
        </Card>
        <Card>
          <Text>Total Photographers Deployed</Text>
          <Metric>{stats.reduce((acc, curr) => acc + curr.activePhotographers, 0)}</Metric>
        </Card>
      </Grid>

      <div className="mt-6">
        <Card>
          <Title>Revenue by Franchise</Title>
          <BarChart
            className="mt-6 h-72"
            data={chartData}
            index="name"
            categories={["Revenue (USD)"]}
            colors={["blue"]}
            yAxisWidth={80}
          />
        </Card>
      </div>
    </div>
  );
}
