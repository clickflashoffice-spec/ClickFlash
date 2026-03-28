const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://gallery-backend.clickflash-office.workers.dev';

interface ContactData {
    name: string;
    email: string;
    service?: string;
    message: string;
}

export interface PortfolioItem {
    id: number;
    title: string;
    category: string;
    description: string;
    image_url: string;
    thumbnail_url: string;
    featured: number;
    sort_order: number;
}

export interface PortfolioResponse {
    success: boolean;
    items: PortfolioItem[];
}

export async function submitContactForm(data: ContactData) {
    const response = await fetch(`${API_BASE_URL}/api/website/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to submit contact form');
    return response.json();
}

export async function fetchPortfolioItems(category?: string, featured?: boolean): Promise<PortfolioResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (featured) params.append('featured', 'true');

    try {
        const response = await fetch(`${API_BASE_URL}/api/website/portfolio?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch portfolio items');
        return response.json();
    } catch (error) {
        console.warn('Portfolio fetch failed (likely build-time offline):', error);
        return { success: true, items: [] };
    }
}

interface BookingData {
    name: string;
    email: string;
    phone?: string;
    service_type: string;
    event_date: string;
    event_location?: string;
    guest_count?: string;
    budget_range?: string;
    message: string;
}

export async function submitBooking(data: BookingData) {
    const response = await fetch(`${API_BASE_URL}/api/website/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to submit booking' })) as { message?: string };
        throw new Error(errorData.message || 'Failed to submit booking');
    }
    return response.json();
}

export interface AccessCodeResponse {
    success: boolean;
    gallery_info: {
        event_name: string;
        client_name: string;
    };
    redirect_url: string;
}

export async function validateAccessCode(code: string): Promise<AccessCodeResponse> {
    const response = await fetch(`${API_BASE_URL}/api/website/access-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Invalid access code' })) as { message?: string };
        throw new Error(errorData.message || 'Invalid access code');
    }
    return response.json();
}
