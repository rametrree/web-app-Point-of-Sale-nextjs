// app/pos/page.tsx
'use client';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, Customer } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

// Helper function to format date
const formatDate = (date: Date) => {
  const d = new Date(date);
  return d.toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Function to print the sale receipt
const printSaleReceipt = (sale: any, cartItems: CartItem[], finalAmount: number, paymentAmount: number, changeDue: number, customer: Customer | null) => {
  const receiptContent = `
    <html>
    <head>
        <title>Sale Receipt</title>
        <style>
            body { font-family: 'Sarabun', sans-serif; font-size: 12px; margin: 0; padding: 10px; }
            .container { width: 200px; margin: 0 auto; }
            .header, .footer { text-align: center; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .item-name { flex-grow: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 50px; text-align: right; }
            .total { text-align: right; font-weight: bold; margin-top: 10px; }
            .line { border-top: 1px dashed #000; margin: 5px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h3>KNC POS</h3>
                <p>Sale ID: ${sale.id}</p>
                <p>Date: ${formatDate(new Date())}</p>
            </div>
            <div class="line"></div>
            ${customer ? `<p>Customer: ${customer.name} ${customer.isMember ? '(Member)' : ''}</p><div class="line"></div>` : ''}
            
            ${cartItems.map(item => `
                <div class="item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty">x${item.quantity}</span>
                    <span class="item-price">${item.price.toFixed(2)}</span>
                </div>
            `).join('')}
            <div class="line"></div>
            <div class="total">Total: ${finalAmount.toFixed(2)}</div>
            ${sale.discount > 0 ? `<div class="total">Discount: -${sale.discount.toFixed(2)}</div>` : ''}
            <div class="total">Final Amount: ${finalAmount.toFixed(2)}</div>
            <div class="total">Payment: ${paymentAmount.toFixed(2)}</div>
            <div class="total">Change: ${changeDue.toFixed(2)}</div>
            <div class="line"></div>
            <div class="footer">
                <p>Thank you for your purchase!</p>
            </div>
        </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(receiptContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } else {
    alert('Please allow pop-ups for printing.');
  }
};


// Type สำหรับ Item ในตะกร้า
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string | null;
  isRefundable: boolean;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanCooldownRef = useRef(false);

  // Refs to hold the latest state and functions to avoid stale closures
  const productsRef = useRef(products);
  useEffect(() => { productsRef.current = products; }, [products]);

  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data: Product[] = await response.json();
        setProducts(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load products');
        if (response.status === 401 || response.status === 403) router.push('/login');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Network error loading products');
    }
  }, [router]);

  const fetchCustomers = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await fetch('/api/customers', { // ต้องสร้าง API /api/customers ก่อน
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data: Customer[] = await response.json();
        setCustomers(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load customers');
        if (response.status === 401 || response.status === 403) router.push('/login');
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Network error loading customers');
    }
  }, [router]);

  // เพิ่มสินค้าเข้าตะกร้า - ใช้ useCallback เพื่อให้ฟังก์ชันเสถียร
  const addToCart = useCallback((product: Product, quantityToAdd: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.productId === product.id);
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;

      if (currentCartQuantity + quantityToAdd > product.stock) {
        setError(`Not enough stock for ${product.name}. Available: ${product.stock - currentCartQuantity}`);
        return prevCart;
      }
      
      setError('');

      if (existingItem) {
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantityToAdd }
            : item
        );
      }
      
      return [
        ...prevCart,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: quantityToAdd,
          sku: product.sku,
          isRefundable: product.isRefundable,
        },
      ];
    });
  }, [setError]); // ระบุ dependency ที่จำเป็น
  const addToCartRef = useRef(addToCart);
  useEffect(() => { addToCartRef.current = addToCart; }, [addToCart]);

  const onScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    if (scanCooldownRef.current) return;

    scanCooldownRef.current = true;
    setTimeout(() => { scanCooldownRef.current = false; }, 1500);

    const product = productsRef.current.find(p => p.sku === decodedText);
    if (product) {
      addToCartRef.current(product);
      setSuccessMessage(`Added ${product.name} to cart.`);
      setTimeout(() => setSuccessMessage(''), 2000);
    } else {
      setError('Product with scanned SKU not found.');
      setTimeout(() => setError(''), 2000);
    }
  }, [productsRef, addToCartRef, scanCooldownRef, setSuccessMessage, setError]);


  useEffect(() => {
    // ตรวจสอบ Authentication เมื่อโหลดหน้า
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    try {
      // Optional: สามารถ decode token เพื่อเช็ค role ได้ถ้าจำเป็น
      // แต่ตอนนี้เราไม่ได้ใช้ userRole ใน component นี้
      JSON.parse(storedUser);
    } catch (e) {
      console.error("Failed to parse user data from localStorage", e);
      router.push('/login');
      return;
    }

    fetchProducts();
    fetchCustomers();
  }, [router, fetchProducts, fetchCustomers]);

  // Barcode Scanner Logic
  useEffect(() => {
    if (isScannerOpen) {
      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      const onScanSuccess = (decodedText: string, decodedResult: any) => {
        if (scanCooldownRef.current) return; // ถ้าอยู่ในช่วง cooldown ให้ข้ามไป

        scanCooldownRef.current = true; // เริ่ม cooldown
        setTimeout(() => { scanCooldownRef.current = false; }, 1500); // Cooldown 1.5 วินาที

        const product = productsRef.current.find(p => p.sku === decodedText);
        if (product) {
          addToCartRef.current(product);
          setSuccessMessage(`Added ${product.name} to cart.`);
          // ล้าง success message หลังจากแสดงผลสักครู่
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          setError('Product with scanned SKU not found.');
          // ล้าง error message หลังจากแสดงผลสักครู่
          setTimeout(() => setError(''), 2000);
        }
      };

      const onScanFailure = (error: any) => {
        // handle scan failure, usually better to ignore and keep scanning.
        // console.warn(`Code scan error = ${error}`);
      };

      scanner.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
        .catch(err => {
          setError("Failed to start scanner. Please check camera permissions.");
          console.error("Scanner start error:", err);
          setIsScannerOpen(false);
        });

    } else {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("Failed to stop scanner:", err);
        });
      }
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => {
          console.error("Cleanup failed to stop scanner:", err);
        });
      }
    };
  }, [isScannerOpen, onScanSuccess]);


  // กรองสินค้าที่แสดงตาม searchTerm
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [products, searchTerm]);

  // ลบสินค้าออกจากตะกร้า
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  // อัปเดตจำนวนสินค้าในตะกร้า
  const updateCartQuantity = (productId: string, newQuantity: number) => {
    setError('');
    const product = products.find(p => p.id === productId);
    if (!product) return; // Should not happen

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      setError(`Cannot add more. Max stock for ${product.name} is ${product.stock}`);
      return;
    }

    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // คำนวณยอดรวมต่างๆ
  const { totalAmount, discount, finalAmount } = useMemo(() => {
    let currentTotal = 0;
    let currentDiscount = 0;
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const customerIsMember = selectedCustomer?.isMember || false;

    cart.forEach((item) => {
      const itemSubtotal = item.price * item.quantity;
      currentTotal += itemSubtotal;

      // ถ้าเป็นสมาชิกและสินค้าคืนเงินได้
      if (customerIsMember && item.isRefundable) {
        currentDiscount += itemSubtotal * 0.02; // 2% cashback
      }
    });

    const currentFinalAmount = currentTotal - currentDiscount;
    return {
      totalAmount: currentTotal,
      discount: currentDiscount,
      finalAmount: currentFinalAmount,
    };
  }, [cart, selectedCustomerId, customers]);

  // คำนวณเงินทอน
  const changeDue = paymentAmount - finalAmount;

  // กำหนดค่าเริ่มต้นของ paymentAmount เป็น finalAmount
  useEffect(() => {
    setPaymentAmount(finalAmount);
  }, [finalAmount]);

  // จัดการการสแกน/กรอก SKU
  const handleScanOrSkuInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = e.currentTarget.value.trim();
      const product = products.find(p => p.sku === input || p.name.toLowerCase() === input.toLowerCase());
      if (product) {
        addToCart(product);
        setSearchTerm(''); // Clear input after adding
      } else {
        setError('Product not found or invalid SKU/name');
      }
      e.currentTarget.value = ''; // Clear input field
    }
  };

  // ดำเนินการชำระเงิน
  const handleCheckout = async () => {
    setError('');
    setSuccessMessage('');

    if (cart.length === 0) {
      setError('Cart is empty. Please add products to proceed.');
      return;
    }
    if (paymentAmount < finalAmount) {
      setError('Payment amount is less than the final amount.');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
        router.push('/login');
        return;
    }

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartItems: cart.map(item => ({ productId: item.productId, quantity: item.quantity })),
          customerId: selectedCustomerId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccessMessage(`Sale completed! Final Amount: $${data.finalAmount.toFixed(2)}. Change: $${changeDue.toFixed(2)}`);
        setCart([]); // Clear cart
        setPaymentAmount(0); // Reset payment
        setSelectedCustomerId(null); // Reset customer
        fetchProducts(); // Refresh product stock
        
        const customerForReceipt = customers.find(c => c.id === selectedCustomerId);
        printSaleReceipt(data, cart, finalAmount, paymentAmount, changeDue, customerForReceipt);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to complete sale');
        if (response.status === 401 || response.status === 403) router.push('/login');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Network error or server unavailable during checkout');
    }
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear the entire cart?')) {
      setCart([]);
      setError('');
      setSuccessMessage('');
      setPaymentAmount(0);
      setSelectedCustomerId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col lg:flex-row gap-4">
      {/* Left Panel: Product List & Search */}
      <div className="bg-white p-6 rounded-lg shadow-md flex-1 lg:max-w-md overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Products</h2>
        <input
          type="text"
          placeholder="Search by name or SKU, or scan barcode..."
          className="w-full p-2 border border-gray-300 rounded-md mb-4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleScanOrSkuInput} // สำหรับกรอก/สแกน SKU แล้วกด Enter
        />

        <button 
          onClick={() => setIsScannerOpen(!isScannerOpen)}
          className="w-full p-2 mb-4 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          {isScannerOpen ? 'Close Scanner' : 'Open Barcode Scanner'}
        </button>

        {isScannerOpen && <div id="reader" className="w-full"></div>}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {successMessage && <p className="text-green-600 text-sm mb-4">{successMessage}</p>}

        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
          {filteredProducts.length === 0 && <p className="text-gray-500">No products found.</p>}
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex justify-between items-center border p-3 rounded-md hover:bg-gray-50 cursor-pointer"
              onClick={() => addToCart(product)}
            >
              <div>
                <p className="font-semibold">{product.name}</p>
                <p className="text-sm text-gray-600">SKU: {product.sku || 'N/A'}</p>
                <p className="text-sm text-gray-600">Stock: {product.stock}</p>
              </div>
              <p className="font-bold text-lg">{product.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel: Cart & Payment */}
      <div className="bg-white p-6 rounded-lg shadow-md flex-1">
        <h2 className="text-2xl font-bold mb-4">Shopping Cart</h2>

        {/* Customer Selection */}
        <div className="mb-4">
          <label htmlFor="customer" className="block text-gray-700 text-sm font-bold mb-2">Select Customer (Optional):</label>
          <select
            id="customer"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={selectedCustomerId || ''}
            onChange={(e) => setSelectedCustomerId(e.target.value || null)}
          >
            <option value="">Walk-in Customer</option>
            {customers.map(customer => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.isMember ? '(Member)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items */}
        <div className="max-h-[calc(100vh-450px)] overflow-y-auto mb-4 border-b pb-4">
          {cart.length === 0 ? (
            <p className="text-gray-500">Cart is empty.</p>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-600">Price: {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                    className="bg-gray-200 hover:bg-gray-300 p-1 rounded-l-md"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 border-t border-b text-center w-12">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                    className="bg-gray-200 hover:bg-gray-300 p-1 rounded-r-md"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="ml-4 text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
                <p className="font-bold">{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>

        {/* Totals and Payment */}
        <div className="mt-4">
          <div className="flex justify-between text-lg font-semibold mb-2">
            <span>Total:</span>
            <span>{totalAmount.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-lg text-green-600 font-semibold mb-2">
              <span>Member Discount:</span>
              <span>-{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-2xl font-bold mb-4">
            <span>Final Amount:</span>
            <span>{finalAmount.toFixed(2)}</span>
          </div>

          <div className="mb-4">
            <label htmlFor="payment" className="block text-gray-700 text-sm font-bold mb-2">Payment Amount:</label>
            <input
              type="number"
              id="payment"
              step="0.01"
              min="0"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              onFocus={() => { if (paymentAmount === finalAmount) setPaymentAmount(0); }}
              className="w-full p-2 border border-gray-300 rounded-md text-3xl text-right font-bold"
            />
          </div>

          <div className="flex justify-between text-xl font-bold mb-6">
            <span>Change Due:</span>
            <span className={changeDue < 0 ? 'text-red-500' : 'text-blue-600'}>{changeDue.toFixed(2)}</span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleCheckout}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg text-xl"
              disabled={cart.length === 0 || paymentAmount < finalAmount}
            >
              Process Payment
            </button>
            <button
              onClick={handleClearCart}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg text-xl"
            >
              Clear Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}