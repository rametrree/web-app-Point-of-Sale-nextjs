// app/dashboard/customers/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Customer } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface CustomerFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  isMember: boolean;
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    isMember: false,
  });
  const router = useRouter();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: Customer[] = await response.json();
        setCustomers(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch customers');
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error('Fetch customers error:', err);
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({ name: '', email: '', phone: '', isMember: false });
    setShowModal(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setIsEditing(true);
    setFormData({
      id: customer.id,
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      isMember: customer.isMember,
    });
    setShowModal(true);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        alert('Customer deleted successfully!');
        fetchCustomers(); // Refresh list
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete customer');
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error('Delete customer error:', err);
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

    const url = isEditing ? `/api/customers/${formData.id}` : '/api/customers';
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
        alert(`Customer ${isEditing ? 'updated' : 'added'} successfully!`);
        setShowModal(false);
        fetchCustomers(); // Refresh customer list
      } else {
        const errorData = await response.json();
        setError(errorData.message || `Failed to ${isEditing ? 'update' : 'add'} customer`);
        if (response.status === 401 || response.status === 403) {
            router.push('/login');
        }
      }
    } catch (err) {
      console.error(`Submit customer error (${method}):`, err);
      setError('Network error or server unavailable');
    }
  };

  if (loading) return <p>Loading customers...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Customer Management</h1>

      <button
        onClick={handleOpenCreateModal}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mb-6"
      >
        Add New Customer
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="py-2 px-4 text-left">Name</th>
              <th className="py-2 px-4 text-left">Email</th>
              <th className="py-2 px-4 text-left">Phone</th>
              <th className="py-2 px-4 text-left">Member</th>
              <th className="py-2 px-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                <td className="py-2 px-4">{customer.name}</td>
                <td className="py-2 px-4">{customer.email || '-'}</td>
                <td className="py-2 px-4">{customer.phone || '-'}</td>
                <td className="py-2 px-4">
                  {customer.isMember ? (
                    <span className="text-green-500">&#10003; Yes</span>
                  ) : (
                    <span className="text-red-500">&#10007; No</span>
                  )}
                </td>
                <td className="py-2 px-4">
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="bg-yellow-500 hover:bg-yellow-700 text-white text-sm font-bold py-1 px-2 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(customer.id)}
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

      {/* Customer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
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
                <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">Email (Optional):</label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="phone" className="block text-gray-700 text-sm font-bold mb-2">Phone (Optional):</label>
                <input
                  type="text"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  name="isMember"
                  id="isMember"
                  checked={formData.isMember}
                  onChange={handleInputChange}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isMember" className="text-gray-700 text-sm font-bold">Is Member</label>
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
                  {isEditing ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}