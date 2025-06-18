// app/dashboard/products/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Product } from '@prisma/client'; // Import type จาก Prisma Client
import { useRouter } from 'next/navigation';

// Type สำหรับ Form Data (เผื่อมีการแก้ไขบางฟิลด์)
interface ProductFormData {
  id?: string; // มีค่าเมื่อแก้ไข
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  isRefundable: boolean;
}

export default function ProductManagementPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    sku: '',
    isRefundable: false,
  });
  const router = useRouter(); // สำหรับการ redirect หรือ refresh page

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login'); // ไม่มี Token ให้กลับไป Login
        return;
    }
    try {
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: Product[] = await response.json();
        setProducts(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch products');
        if (response.status === 401 || response.status === 403) {
            router.push('/login'); // Token หมดอายุหรือไม่มีสิทธิ์
        }
      }
    } catch (err) {
      console.error('Fetch products error:', err);
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value),
    }));
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({ name: '', description: '', price: 0, stock: 0, sku: '', isRefundable: false });
    setShowModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setIsEditing(true);
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      sku: product.sku || '',
      isRefundable: product.isRefundable,
    });
    setShowModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        alert('Product deleted successfully!');
        fetchProducts(); // Refresh list
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete product');
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error('Delete product error:', err);
      setError('Network error or server unavailable');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    const url = isEditing ? `/api/products/${formData.id}` : '/api/products';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(`Product ${isEditing ? 'updated' : 'added'} successfully!`);
        setShowModal(false);
        fetchProducts(); // Refresh product list
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} product`);
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error(`Submit product error (${method}):`, err);
      setError('Network error or server unavailable');
    }
  };

  if (loading) return <p>Loading products...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Product Management</h1>

      <button
        onClick={handleOpenCreateModal}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-6"
      >
        Add New Product
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">SKU</th>
              <th className="py-2 px-4 text-left">Price</th>
              <th className="py-2 px-4 text-left">Stock</th>
              <th className="py-2 px-4 text-left">Refundable</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-4">{product.name}</td>
                <td className="py-2 px-4">{product.sku || '-'}</td>
                <td className="py-2 px-4">${product.price.toFixed(2)}</td>
                <td className="py-2 px-4">{product.stock}</td>
                <td className="py-2 px-4">
                  {product.isRefundable ? (
                    <span className="text-green-500">&#10003; Yes</span>
                  ) : (
                    <span className="text-red-500">&#10007; No</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white text-sm font-bold py-1 px-2 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-2 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 text-sm font-bold mb-2">Name:</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="sku" className="block text-gray-700 text-sm font-bold mb-2">SKU (Optional):</label>
                <input
                  type="text"
                  name="sku"
                  id="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="price" className="block text-gray-700 text-sm font-bold mb-2">Price:</label>
                <input
                  type="number"
                  name="price"
                  id="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0.01"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="stock" className="block text-gray-700 text-sm font-bold mb-2">Stock:</label>
                <input
                  type="number"
                  name="stock"
                  id="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">Description (Optional):</label>
                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                ></textarea>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  name="isRefundable"
                  id="isRefundable"
                  checked={formData.isRefundable}
                  onChange={handleInputChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRefundable" className="text-gray-700 text-sm font-bold">Eligible for Member Refund (2%)</label>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  {isEditing ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}