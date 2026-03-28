
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Pack } from '../types.ts';
import ProductEditModal from './modals/ProductEditModal';
import PackEditModal from './modals/PackEditModal';
import { useCurrency } from './CurrencyContext';
import { apiService } from '../services/apiService.ts';
import Spinner from './common/Spinner';
import Card from './common/Card';
import { useDebounce } from '../hooks/useDebounce.ts';

/**
 * ProductsPage Component
 * 
 * Manages products and packs for the e-commerce system.
 * 
 * Features:
 * - Product and pack management (CRUD operations)
 * - Search and category filtering
 * - Tab-based navigation (products/packs)
 * - Edit modals for products and packs
 * - Currency formatting
 * - Performance optimized with debounced search
 * 
 * State Management:
 * - Separate state for products and packs
 * - Loading and error states
 * - Modal state management
 */
const ProductsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'packs'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [packs, setPacks] = useState<Pack[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const { formatCurrency } = useCurrency();
    
    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    
    const [isPackModalOpen, setPackModalOpen] = useState(false);
    const [packToEdit, setPackToEdit] = useState<Pack | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [productsData, packsData] = await Promise.all([
                apiService.getProducts(), 
                apiService.getPacks()
            ]);
            setProducts(productsData);
            setPacks(packsData);
        } catch (e) {
            console.error("Failed to load products/packs", e);
            setError('Failed to load products and packs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);
    
    const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
        if ('id' in productData && productData.id) {
            await apiService.updateProduct(productData.id, productData);
        } else {
            await apiService.createProduct(productData);
        }
        setProductModalOpen(false);
        fetchData();
    };
    
    const handleDeleteProduct = async (id: string, name: string) => {
        if(window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            try {
                await apiService.deleteProduct(id);
                fetchData();
            } catch (e) {
                console.error("Failed to delete product", e);
                alert('Failed to delete product. Please try again.');
            }
        }
    };
    
    const handleSavePack = async (packData: Omit<Pack, 'id'> | Pack) => {
         if ('id' in packData && packData.id) {
            await apiService.updatePack(packData.id, packData);
        } else {
            await apiService.createPack(packData);
        }
        setPackModalOpen(false);
        fetchData();
    };

    const handleDeletePack = async (id: string, name: string) => {
        if(window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
            try {
                await apiService.deletePack(id);
                fetchData();
            } catch (e) {
                console.error("Failed to delete pack", e);
                alert('Failed to delete pack. Please try again.');
            }
        }
    };

    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return Array.from(cats).sort();
    }, [products]);

    const filteredProducts = useMemo(() => {
        let filtered = products;
        
        if (debouncedSearchTerm) {
            const searchLower = debouncedSearchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                p.category.toLowerCase().includes(searchLower)
            );
        }
        
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(p => p.category === categoryFilter);
        }
        
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
    }, [products, debouncedSearchTerm, categoryFilter]);

    const kpiData = useMemo(() => {
        const totalProducts = products.length;
        const totalPacks = packs.length;
        const totalValue = products.reduce((sum, p) => sum + p.price, 0);
        const avgPrice = totalProducts > 0 ? totalValue / totalProducts : 0;
        return { totalProducts, totalPacks, totalValue, avgPrice };
    }, [products, packs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-red-100 dark:bg-red-900/20 rounded-full p-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Error Loading Products</h3>
                <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                <button
                    onClick={fetchData}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn pb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Product Catalog</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage products, packages, and pricing</p>
                </div>
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('products')} 
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                            activeTab === 'products' 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Products
                    </button>
                    <button 
                        onClick={() => setActiveTab('packs')} 
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 ${
                            activeTab === 'packs' 
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Packages
                    </button>
                </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <Card className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Products</p>
                        <p className="text-2xl font-bold">{kpiData.totalProducts}</p>
                    </div>
                </Card>
                <Card className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Packages</p>
                        <p className="text-2xl font-bold">{kpiData.totalPacks}</p>
                    </div>
                </Card>
                <Card className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v-1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Average Price</p>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.avgPrice)}</p>
                    </div>
                </Card>
                <Card className="flex items-start space-x-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10 text-yellow-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Value</p>
                        <p className="text-2xl font-bold">{formatCurrency(kpiData.totalValue)}</p>
                    </div>
                </Card>
            </div>

            {activeTab === 'products' && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">All Products</h2>
                        <button 
                            onClick={() => { setProductToEdit(null); setProductModalOpen(true); }} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Product
                        </button>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-grow">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                                </svg>
                            </span>
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        {categories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    <Card className="!p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left min-w-[600px]">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 sticky top-0 z-10">
                                   <tr>
                                       <th className="p-4">Name</th>
                                       <th className="p-4">Category</th>
                                       <th className="p-4 text-right">Price</th>
                                       <th className="p-4 text-right">Stock</th>
                                       <th className="p-4 text-center">Actions</th>
                                   </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                        <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{p.name}</td>
                                            <td className="p-4">
                                                <span className="bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase">
                                                    {p.category}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-mono text-green-600 dark:text-green-400 font-bold">{formatCurrency(p.price)}</td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                    p.stock === 9999 
                                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                                                        : p.stock > 10 
                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                                        : p.stock > 0
                                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                                }`}>
                                                    {p.stock === 9999 ? 'Unlimited' : p.stock}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center space-x-2">
                                                <button 
                                                    onClick={() => { setProductToEdit(p); setProductModalOpen(true); }} 
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteProduct(p.id, p.name)} 
                                                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-6 w-20 h-20 mb-4 flex items-center justify-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                                                        {debouncedSearchTerm || categoryFilter !== 'all' ? "No Products Found" : "No Products Yet"}
                                                    </h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                                                        {debouncedSearchTerm || categoryFilter !== 'all'
                                                            ? `No products match your current filters. Try adjusting your search or category filter.`
                                                            : "Get started by creating your first product using the 'Add Product' button above."}
                                                    </p>
                                                    {(!debouncedSearchTerm && categoryFilter === 'all') && (
                                                        <button
                                                            onClick={() => { setProductToEdit(null); setProductModalOpen(true); }}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Create First Product
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}
            
            {activeTab === 'packs' && (
                 <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Packages & Bundles</h2>
                        <button 
                            onClick={() => { setPackToEdit(null); setPackModalOpen(true); }} 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                            Add Pack
                        </button>
                    </div>
                    {packs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {packs.map(p => (
                                <Card key={p.id} className="flex flex-col h-full hover:shadow-lg transition-all duration-300">
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{p.name}</h3>
                                        <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-xl font-bold text-sm">
                                            {formatCurrency(p.price)}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex-grow">{p.description || 'No description provided.'}</p>
                                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end space-x-3">
                                        <button 
                                            onClick={() => { setPackToEdit(p); setPackModalOpen(true); }} 
                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePack(p.id, p.name)} 
                                            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <div className="bg-white dark:bg-slate-800 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Packages Yet</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                                Create packages and bundles to offer customers special deals and combinations.
                            </p>
                            <button
                                onClick={() => { setPackToEdit(null); setPackModalOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 inline-flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                                Create First Package
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isProductModalOpen && <ProductEditModal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} onSave={handleSaveProduct} productToEdit={productToEdit} />}
            {isPackModalOpen && <PackEditModal isOpen={isPackModalOpen} onClose={() => setPackModalOpen(false)} onSave={handleSavePack} packToEdit={packToEdit} />}
        </div>
    );
};

export default ProductsPage;