import React, { useState, useEffect } from 'react';
import { Product, Pack } from '../../types.ts';
import ProductEditModal from '../modals/ProductEditModal.tsx';
import PackEditModal from '../modals/PackEditModal.tsx';
import { useCurrency } from '../CurrencyContext.tsx';
import { apiService } from '../../services/apiService.ts';
import Spinner from '../common/Spinner.tsx';

const ProductsAndPricing: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [packs, setPacks] = useState<Pack[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency } = useCurrency();
    
    const [isProductModalOpen, setProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    
    const [isPackModalOpen, setPackModalOpen] = useState(false);
    const [packToEdit, setPackToEdit] = useState<Pack | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [productsData, packsData] = await Promise.all([apiService.getProducts(), apiService.getPacks()]);
        setProducts(productsData);
        setPacks(packsData);
        setLoading(false);
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
    
    const handleDeleteProduct = async (id: string) => {
        if(window.confirm('Are you sure you want to delete this product?')) {
            await apiService.deleteProduct(id);
            fetchData();
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

    const handleDeletePack = async (id: string) => {
        if(window.confirm('Are you sure you want to delete this pack?')) {
            await apiService.deletePack(id);
            fetchData();
        }
    };

    if (loading) return <Spinner />;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Products Section */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Products</h2>
                    <button onClick={() => { setProductToEdit(null); setProductModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Add Product</button>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                           <tr><th className="p-4">Name</th><th className="p-4">Category</th><th className="p-4">Price</th><th className="p-4">Actions</th></tr>
                        </thead>
                        <tbody>
                            {products.map(p => (
                                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4">{p.name}</td>
                                    <td className="p-4">{p.category}</td>
                                    <td className="p-4">{formatCurrency(p.price)}</td>
                                    <td className="p-4 space-x-2">
                                        <button onClick={() => { setProductToEdit(p); setProductModalOpen(true); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Edit</button>
                                        <button onClick={() => handleDeleteProduct(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Packs Section */}
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Packs</h2>
                    <button onClick={() => { setPackToEdit(null); setPackModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg">Add Pack</button>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                           <tr><th className="p-4">Name</th><th className="p-4">Price</th><th className="p-4">Actions</th></tr>
                        </thead>
                        <tbody>
                            {packs.map(p => (
                                <tr key={p.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4">{p.name}</td>
                                    <td className="p-4">{formatCurrency(p.price)}</td>
                                    <td className="p-4 space-x-2">
                                        <button onClick={() => { setPackToEdit(p); setPackModalOpen(true); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Edit</button>
                                        <button onClick={() => handleDeletePack(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isProductModalOpen && <ProductEditModal isOpen={isProductModalOpen} onClose={() => setProductModalOpen(false)} onSave={handleSaveProduct} productToEdit={productToEdit} />}
            {isPackModalOpen && <PackEditModal isOpen={isPackModalOpen} onClose={() => setPackModalOpen(false)} onSave={handleSavePack} packToEdit={packToEdit} />}
        </div>
    );
};

export default ProductsAndPricing;