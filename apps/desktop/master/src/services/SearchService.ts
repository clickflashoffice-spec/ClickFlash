import { db } from './db';
import { SearchResult } from '../context/GlobalSearchContext';
import React from 'react';
import { Folder, ShoppingCart, User } from 'lucide-react';

class SearchService {
    async search(query: string): Promise<SearchResult[]> {
        if (!query || query.trim().length < 1) {
            return this.getRecentResults();
        }

        const normalizedQuery = query.toLowerCase().trim();
        const results: SearchResult[] = [];

        // 1. Search Albums (indexed search)
        const albums = await db.albums
            .filter(a => a.title.toLowerCase().includes(normalizedQuery))
            .limit(5)
            .toArray();

        results.push(...albums.map(a => ({
            id: `album-${a.id}`,
            type: 'album' as const,
            title: a.title,
            subtitle: `Album • ${a.date}`,
            icon: React.createElement(Folder, { size: 18 }),
            url: `/albums`
        })));

        // 2. Search Orders
        const orders = await db.orders
            .filter(o =>
            (o.clientName?.toLowerCase().includes(normalizedQuery) ||
                o.orderNumber?.toLowerCase().includes(normalizedQuery) ||
                o.id.toLowerCase().includes(normalizedQuery))
            )
            .limit(5)
            .toArray();

        results.push(...orders.map(o => ({
            id: `order-${o.id}`,
            type: 'order' as const,
            title: o.orderNumber || o.clientName || 'Unnamed Order',
            subtitle: `Order • ${o.total.toFixed(2)} • ${o.status}`,
            icon: React.createElement(ShoppingCart, { size: 18 }),
            url: `/orders`
        })));

        // 3. Search Photographers
        const users = await db.users
            .filter(u => u.name.toLowerCase().includes(normalizedQuery) || u.email.toLowerCase().includes(normalizedQuery))
            .limit(3)
            .toArray();

        results.push(...users.map(u => ({
            id: `pg-${u.id}`,
            type: 'photographer' as const,
            title: u.name,
            subtitle: `Photographer • ${u.role}`,
            icon: React.createElement(User, { size: 18 }),
            url: `/photographers`
        })));

        return results;
    }

    private async getRecentResults(): Promise<SearchResult[]> {
        // Return recent albums by default
        const recentAlbums = await db.albums
            .orderBy('date')
            .reverse()
            .limit(5)
            .toArray();

        return [
            ...recentAlbums.map(a => ({
                id: `album-${a.id}`,
                type: 'album' as const,
                title: a.title,
                subtitle: `Recent Album • ${a.date}`,
                icon: React.createElement(Folder, { size: 18 }),
                url: `/albums`
            }))
        ];
    }
}

export const searchService = new SearchService();
