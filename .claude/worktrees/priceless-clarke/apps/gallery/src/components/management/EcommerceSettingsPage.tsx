import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../../types.ts';
import { apiService } from '../../services/apiService.ts';
import Card from '../common/Card.tsx';
import Spinner from '../common/Spinner.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import ProductEditModal from '../modals/ProductEditModal.tsx';

const StatCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
    <Card>
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
    </Card>
);

const EcommerceSettingsPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const { formatCurrency } = useCurrency();

    const fetchData = async () => {
        setLoading(true);
        try {
            const productsData = await apiService.getProducts();
            setProducts(productsData);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const kpiData = useMemo(() => {
        const featuredProducts = products.filter(p => p.isFeatured).length;
        const totalProducts = products.length;
        const averagePrice = totalProducts > 0 ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts : 0;
        return { totalProducts, featuredProducts, averagePrice };
    }, [products]);

    const handleOpenModal = (product: Product | null) => {
        setProductToEdit(product);
        setIsModalOpen(true);
    };

    const handleSaveProduct = async (productData: Omit<Product, 'id'> | Product) => {
        if ('id' in productData && productData.id) {
            await apiService.updateProduct(productData.id, productData);
        } else {
            await apiService.createProduct(productData);
        }
        setIsModalOpen(false);
        setProductToEdit(null);
        fetchData(); // Refresh list
    };
    
    const handleDeleteProduct = async (id: string, name: string) => {
        if(window.confirm(`Are you sure you want to delete the product "${name}"?`)) {
            await apiService.deleteProduct(id);
            fetchData();
        }
    };

    const handleToggleFeatured = async (product: Product) => {
        const originalProducts = [...products];
        const updatedProduct = { ...product, isFeatured: !product.isFeatured };
        
        // Optimistic UI update
        setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
        
        try {
            await apiService.updateProduct(product.id, updatedProduct);
        } catch (error) {
            // Revert on error
            setProducts(originalProducts);
            alert('Failed to update product status.');
        }
    };


    if (loading) return <Spinner />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">E-commerce & Product Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Products" value={kpiData.totalProducts.toString()} />
                <StatCard title="Featured Products" value={`${kpiData.featuredProducts} / ${kpiData.totalProducts}`} />
                <StatCard title="Average Price" value={formatCurrency(kpiData.averagePrice)} />
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Manage Products</h2>
                    <button onClick={() => handleOpenModal(null)} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">
                        Add Product
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[640px]">
                        <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">Category</th>
                                <th className="p-4 text-right">Price</th>
                                <th className="p-4 text-center">Featured</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50">
                                    <td className="p-4 font-semibold">{p.name}</td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400">{p.category}</td>
                                    <td className="p-4 text-right font-mono">{formatCurrency(p.price)}</td>
                                    <td className="p-4 text-center">
                                         <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={!!p.isFeatured}
                                                onChange={() => handleToggleFeatured(p)}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </td>
                                    <td className="p-4 text-center space-x-4">
                                        <button onClick={() => handleOpenModal(p)} className="text-blue-400 hover:text-blue-300 font-semibold">Edit</button>
                                        <button onClick={() => handleDeleteProduct(p.id, p.name)} className="text-red-400 hover:text-red-300 font-semibold">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <ProductEditModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveProduct}
                    productToEdit={productToEdit}
                />
            )}
        </div>
    );
};

export default EcommerceSettingsPage;