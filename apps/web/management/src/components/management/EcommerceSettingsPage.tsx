import React, { useState, useEffect, useMemo } from "react";
import { Product, Pack, EcommerceExtension } from "../../types.ts";
import { apiService } from "../../services/apiService.ts";
import { Card } from "@clickflash/ui";
import { Spinner } from "@clickflash/ui";
import { useCurrency } from "../CurrencyContext.tsx";
import ProductEditModal from "../modals/ProductEditModal.tsx";
import PackEditModal from "../modals/PackEditModal.tsx";
import ExtensionConfigModal from "../modals/ExtensionConfigModal.tsx";
import ExtensionCreateModal from "../modals/ExtensionCreateModal.tsx";
import { AVAILABLE_EXTENSIONS } from "../../utils/ExtensionRegistry.ts";
import useSystemSetting from "../../hooks/useSystemSetting.ts";

import StatCard from "../common/StatCard.tsx";
import { logger } from "@/utils/logger";

const EcommerceSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "products" | "packs" | "extensions"
  >("products");

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const {
    value: extensions,
    update: setExtensions,
    isLoading: isExtensionsLoading,
  } = useSystemSetting<EcommerceExtension[]>(
    "ecommerceExtensions",
    AVAILABLE_EXTENSIONS,
  );

  const [loading, setLoading] = useState(true);

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Pack Modal State
  const [isPackModalOpen, setIsPackModalOpen] = useState(false);
  const [packToEdit, setPackToEdit] = useState<Pack | null>(null);

  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [extensionToConfig, setExtensionToConfig] =
    useState<EcommerceExtension | null>(null);
  const [isCreateExtensionModalOpen, setIsCreateExtensionModalOpen] =
    useState(false);

  const { formatCurrency } = useCurrency();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsData, packsData] = await Promise.all([
        apiService.getProducts(),
        apiService.getPacks(),
      ]);
      setProducts(productsData);
      setPacks(packsData);
    } catch (error) {
      logger.error("Failed to load e-commerce data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const kpiData = useMemo(() => {
    const featuredProducts = products.filter((p) => p.isFeatured).length;
    const totalProducts = products.length;
    const totalPacks = packs.length;
    const activeExtensions = extensions.filter(
      (e) => e.status === "active",
    ).length;
    const averagePrice =
      totalProducts > 0
        ? products.reduce((sum, p) => sum + p.price, 0) / totalProducts
        : 0;
    return {
      totalProducts,
      featuredProducts,
      averagePrice,
      totalPacks,
      activeExtensions,
    };
  }, [products, packs, extensions]);

  // Product Handlers
  const handleOpenProductModal = (product: Product | null) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (
    productData: Omit<Product, "id"> | Product,
  ) => {
    if ("id" in productData && productData.id) {
      await apiService.updateProduct(productData.id, productData);
    } else {
      await apiService.createProduct(productData);
    }
    setIsProductModalOpen(false);
    setProductToEdit(null);
    fetchData();
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (
      window.confirm(`Are you sure you want to delete the product "${name}"?`)
    ) {
      await apiService.deleteProduct(id);
      fetchData();
    }
  };

  const handleToggleFeatured = async (product: Product) => {
    const originalProducts = [...products];
    const updatedProduct = { ...product, isFeatured: !product.isFeatured };

    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? updatedProduct : p)),
    );

    try {
      await apiService.updateProduct(product.id, updatedProduct);
    } catch {
      setProducts(originalProducts);
      alert("Failed to update product status.");
    }
  };

  // Pack Handlers
  const handleOpenPackModal = (pack: Pack | null) => {
    setPackToEdit(pack);
    setIsPackModalOpen(true);
  };

  const handleSavePack = async (packData: Omit<Pack, "id"> | Pack) => {
    if ("id" in packData && packData.id) {
      await apiService.updatePack(packData.id, packData);
    } else {
      await apiService.createPack(packData);
    }
    setIsPackModalOpen(false);
    setPackToEdit(null);
    fetchData();
  };

  const handleDeletePack = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the pack "${name}"?`)) {
      await apiService.deletePack(id);
      fetchData();
    }
  };

  // Extension Handlers
  const handleToggleExtension = (id: string) => {
    const updated = extensions.map((ext): EcommerceExtension => {
      if (ext.id === id) {
        return {
          ...ext,
          status: ext.status === "active" ? "inactive" : "active",
        };
      }
      return ext;
    });
    setExtensions(updated);
  };

  const handleConfigureExtension = (ext: EcommerceExtension) => {
    setExtensionToConfig(ext);
    setIsExtensionModalOpen(true);
  };

  const handleSaveExtensionConfig = (
    id: string,
    config: Record<string, string>,
  ) => {
    const updated = extensions.map(
      (ext): EcommerceExtension =>
        ext.id === id ? { ...ext, config, status: "active" } : ext,
    );
    setExtensions(updated);
  };

  const handleCreateExtension = (newExtension: EcommerceExtension) => {
    const updated = [...extensions, newExtension];
    setExtensions(updated);
  };

  if (loading || isExtensionsLoading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">E-commerce & Product Management</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Products"
          value={kpiData.totalProducts.toString()}
        />
        <StatCard title="Active Packs" value={kpiData.totalPacks.toString()} />
        <StatCard
          title="Active Extensions"
          value={kpiData.activeExtensions.toString()}
        />
        <StatCard
          title="Avg. Product Price"
          value={formatCurrency(kpiData.averagePrice)}
        />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-fit">
        {(["products", "packs", "extensions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              Individual Products
            </h2>
            <button
              onClick={() => handleOpenProductModal(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
            >
              Add Product
            </button>
          </div>
          <Card>
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
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-500"
                      >
                        No products found. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-4 font-semibold">{p.name}</td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {p.category}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="p-4 text-center">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!p.isFeatured}
                              onChange={() => handleToggleFeatured(p)}
                              className="sr-only peer"
                              aria-label={`Toggle featured status for ${p.name}`}
                            />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </td>
                        <td className="p-4 text-center space-x-4">
                          <button
                            onClick={() => handleOpenProductModal(p)}
                            className="text-blue-500 hover:text-blue-400 font-semibold text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="text-red-500 hover:text-red-400 font-semibold text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Packs Tab */}
      {activeTab === "packs" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              Packs & Bundles
            </h2>
            <button
              onClick={() => handleOpenPackModal(null)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors"
            >
              Add Pack
            </button>
          </div>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[640px]">
                <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="p-4">Pack Name</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-center">Items</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-500"
                      >
                        No packs found. Create bundles to increase average order
                        value.
                      </td>
                    </tr>
                  ) : (
                    packs.map((pack) => (
                      <tr
                        key={pack.id}
                        className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-4 font-semibold">{pack.name}</td>
                        <td className="p-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">
                          {pack.description}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {pack.products?.length || 0}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(pack.price)}
                        </td>
                        <td className="p-4 text-center space-x-4">
                          <button
                            onClick={() => handleOpenPackModal(pack)}
                            className="text-blue-500 hover:text-blue-400 font-semibold text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePack(pack.id, pack.name)}
                            className="text-red-500 hover:text-red-400 font-semibold text-sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Extensions Tab */}
      {activeTab === "extensions" && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                Store Extensions & Plugins
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">
                Extend your online shop with payment gateways, shipping
                providers, and marketing tools.
              </p>
            </div>
            <button
              onClick={() => setIsCreateExtensionModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
            >
              <span>+ Add Custom Extension</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {extensions.map((ext) => (
              <Card key={ext.id}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-3xl">{ext.icon}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ext.status === "active"}
                      onChange={() => handleToggleExtension(ext.id)}
                      className="sr-only peer"
                      aria-label={`Toggle ${ext.name}`}
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <h3 className="text-lg font-bold mb-1">{ext.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">
                  {ext.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${ext.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"}`}
                  >
                    {ext.status === "active" ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => handleConfigureExtension(ext)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Configure
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Modals */}
      {isProductModalOpen && (
        <ProductEditModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleSaveProduct}
          productToEdit={productToEdit}
        />
      )}

      {isPackModalOpen && (
        <PackEditModal
          isOpen={isPackModalOpen}
          onClose={() => setIsPackModalOpen(false)}
          onSave={handleSavePack}
          packToEdit={packToEdit}
        />
      )}

      {isExtensionModalOpen && extensionToConfig && (
        <ExtensionConfigModal
          isOpen={isExtensionModalOpen}
          onClose={() => setIsExtensionModalOpen(false)}
          extension={extensionToConfig}
          onSave={handleSaveExtensionConfig}
        />
      )}

      {isCreateExtensionModalOpen && (
        <ExtensionCreateModal
          isOpen={isCreateExtensionModalOpen}
          onClose={() => setIsCreateExtensionModalOpen(false)}
          onSave={handleCreateExtension}
        />
      )}
    </div>
  );
};

export default EcommerceSettingsPage;
