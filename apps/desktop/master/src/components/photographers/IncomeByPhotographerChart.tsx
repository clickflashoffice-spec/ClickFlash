import { Card } from "@clickflash/ui";
import React, { useMemo } from 'react';
import { BarChart } from '@tremor/react';

import { Order, Photographer } from '../../types.ts';
import { useCurrency } from '../CurrencyContext.tsx';

interface IncomeByPhotographerChartProps {
    orders: Order[];
    photographers: Photographer[];
}

const IncomeByPhotographerChart: React.FC<IncomeByPhotographerChartProps> = ({ orders, photographers }) => {
    const { currency, formatCurrency } = useCurrency();

    const chartData = useMemo(() => {
        const salesMap = new Map<string, number>();
        orders.forEach(order => {
            if (order.status === 'Completed') {
                const pId = String(order.photographerId);
                salesMap.set(pId, (salesMap.get(pId) || 0) + order.total);
            }
        });

        return photographers
            .map(p => ({
                name: p.name,
                Sales: (salesMap.get(String(p.id)) || 0) * currency.rate,
            }))
            .sort((a, b) => b.Sales - a.Sales);
    }, [orders, photographers, currency]);

    return (
        <Card className="h-full">
            <h3 className="text-lg font-bold mb-4">Income by Photographer</h3>
            <div className="h-[22rem]">
                <BarChart
                    className="h-full"
                    data={chartData}
                    index="name"
                    categories={['Sales']}
                    colors={['blue']}
                    layout="vertical"
                    valueFormatter={(number: number) => formatCurrency(number)}
                    showLegend={false}
                />
            </div>
        </Card>
    );
};

export default IncomeByPhotographerChart;