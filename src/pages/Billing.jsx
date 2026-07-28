/**
 * @file Billing POS page component for creating bills, processing payments, and customer selection.
 * @module pages/Billing
 */
import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { formatCurrency, sortByFEFO } from '../utils/helpers';
import { FaSearch, FaTrash, FaCheck, FaMicrophone, FaStop, FaPlus, FaEdit, FaTimesCircle } from 'react-icons/fa';

const Billing = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [billItems, setBillItems] = useState([]);
  const [customerType, setCustomerType] = useState('walking'); // walking or regular
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash or gpay
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [currentBill, setCurrentBill] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(null); // 'search' or 'quantity'
  const [recognition, setRecognition] = useState(null);
  const [editingItem, setEditingItem] = useState(null); // Track which item is being edited
  const [editQuantity, setEditQuantity] = useState(1);

  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (voiceMode === 'search') {
          setSearchTerm(transcript);
        } else if (voiceMode === 'quantity') {
          // Extract numbers from transcript
          const numbers = transcript.match(/\d+/);
          if (numbers) {
            setQuantity(parseInt(numbers[0]));
          }
        }
        setIsListening(false);
        setVoiceMode(null);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setVoiceMode(null);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [voiceMode]);

  // Fetch billing data (Medicines and Customers from API)
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const [medicinesRes, customersRes] = await Promise.all([
          axiosInstance.get('/inventory'),
          axiosInstance.get('/customers')
        ]);
        setMedicines(medicinesRes.data.medicines || []);
        setCustomers(customersRes.data.customers || []);
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBillingData();
  }, []);

  // Start voice input
  const startVoiceInput = (mode) => {
    if (recognition) {
      setVoiceMode(mode);
      setIsListening(true);
      recognition.start();
    } else {
      console.warn('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  // Stop voice input
  const stopVoiceInput = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
      setVoiceMode(null);
    }
  };

  // Filter medicines based on search
  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add item to bill
  const handleAddItem = () => {
    if (!selectedMedicine || quantity <= 0) return;

    // Check if enough stock
    if (quantity > selectedMedicine.quantity) {
      return;
    }

    const existingItem = billItems.find(item => item.medicineId === selectedMedicine.id);

    if (existingItem) {
      // Update quantity if medicine already in bill
      setBillItems(billItems.map(item =>
        item.medicineId === selectedMedicine.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      // Add new item
      const primaryBatch = selectedMedicine.batches && selectedMedicine.batches.length > 0 ? selectedMedicine.batches[0] : {};
      const newItem = {
        medicineId: selectedMedicine._id,
        name: selectedMedicine.name,
        batchNo: primaryBatch.batchNumber || 'N/A',
        expiryDate: primaryBatch.expiryDate ? new Date(primaryBatch.expiryDate).toLocaleDateString() : 'N/A',
        rackNo: primaryBatch.rackNumber || 'N/A',
        price: selectedMedicine.sellingPrice,
        quantity: quantity,
        total: selectedMedicine.sellingPrice * quantity
      };
      setBillItems([...billItems, newItem]);
    }

    // Reset selection
    setSelectedMedicine(null);
    setQuantity(1);
    setSearchTerm('');
  };

  // Remove item from bill (DELETE operation)
  const handleRemoveItem = (medicineId) => {
    setBillItems(billItems.filter(item => item.medicineId !== medicineId));
  };

  // Update item quantity (UPDATE operation)
  const handleUpdateItem = (medicineId) => {
    if (editQuantity <= 0) {
      return;
    }

    const medicine = medicines.find(m => m._id === medicineId);
    if (editQuantity > medicine.quantity) {
      return;
    }

    setBillItems(billItems.map(item => {
      if (item.medicineId === medicineId) {
        return {
          ...item,
          quantity: editQuantity,
          total: item.price * editQuantity
        };
      }
      return item;
    }));

    setEditingItem(null);
    setEditQuantity(1);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(1);
  };

  // Calculate bill totals
  const subtotal = billItems.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.12; // 12% GST
  const grandTotal = subtotal + tax;

  // Process payment
  const handlePayment = async () => {
    if (billItems.length === 0) {
      return;
    }

    const finalCustomerName = customerType === 'regular' && selectedCustomer
      ? selectedCustomer.name
      : (walkInName.trim() ? `${walkInName.trim()}${walkInPhone.trim() ? ` (${walkInPhone.trim()})` : ''}` : 'Walking Customer');

    const payload = {
      customerType,
      customerId: customerType === 'regular' && selectedCustomer ? selectedCustomer._id : null,
      customerName: finalCustomerName,
      items: billItems.map(item => ({
        medicineId: item.medicineId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
        batchNumber: item.batchNo
      })),
      subtotal,
      tax,
      totalAmount: grandTotal,
      paymentMethod
    };

    try {
      const res = await axiosInstance.post('/billing', payload);

      setCurrentBill({
        id: res.data.bill.billNumber || res.data.bill._id,
        date: res.data.bill.createdAt || new Date().toISOString(),
        customerType: res.data.bill.customerType || customerType,
        customerName: res.data.bill.customerName || payload.customerName,
        total: res.data.bill.grandTotal || payload.totalAmount,
        paymentMethod: res.data.bill.paymentMethod
      });
      setShowPaymentSuccess(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setBillItems([]);
        setCustomerType('walking');
        setSelectedCustomer(null);
        setWalkInName('');
        setWalkInPhone('');
        setPaymentMethod('cash');
        setShowPaymentSuccess(false);
        setCurrentBill(null);
      }, 3000);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to process payment. ' + (error.response?.data?.message || ''));
    }
  };

  // Payment success screen
  if (showPaymentSuccess && currentBill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <FaCheck className="text-green-600 text-4xl" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">Transaction completed successfully</p>

          <div className="bg-gray-50 p-6 rounded-xl mb-6">
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Bill ID:</span>
              <span className="font-semibold">#{currentBill.id}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Amount Paid:</span>
              <span className="font-bold text-2xl text-primary-600">{formatCurrency(currentBill.total)}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-semibold uppercase">{currentBill.paymentMethod}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Date & Time:</span>
              <span className="font-semibold">{new Date(currentBill.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-semibold">
                {currentBill.customerName}
                {currentBill.customerType === 'regular' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Regular</span>
                )}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500">Redirecting to new bill...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Billing</h1>
          <p className="text-gray-600 mt-2">Create new bills with FEFO batch preference</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Section - Medicine Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Select Medicine</h2>

            {/* Customer Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Type</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setCustomerType('walking')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${customerType === 'walking'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-600'
                    }`}
                >
                  Walking Customer
                </button>
                <button
                  onClick={() => setCustomerType('regular')}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${customerType === 'regular'
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-600'
                    }`}
                >
                  Regular Customer
                </button>
              </div>
            </div>

            {/* Regular Customer Selection */}
            {customerType === 'regular' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Customer</label>
                <select
                  value={selectedCustomer?._id || ''}
                  onChange={(e) => setSelectedCustomer(customers.find(c => c._id === e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Choose a customer</option>
                  {customers.filter(c => c.customerType === 'regular').map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Walk-in Customer Details */}
            {customerType === 'walking' && (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name (Optional)</label>
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="E.g. John Doe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="E.g. 9876543210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}

            {/* Medicine Search */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Medicine</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (selectedMedicine) {
                      setSelectedMedicine(null);
                    }
                  }}
                  placeholder="Search by name or category..."
                  className="w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={() => isListening && voiceMode === 'search' ? stopVoiceInput() : startVoiceInput('search')}
                  className={`absolute right-2 top-2 p-2 rounded-lg transition-colors ${isListening && voiceMode === 'search'
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  title={isListening && voiceMode === 'search' ? 'Stop voice input' : 'Voice search'}
                >
                  {isListening && voiceMode === 'search' ? <FaStop /> : <FaMicrophone />}
                </button>
              </div>
              {isListening && voiceMode === 'search' && (
                <p className="text-sm text-primary-600 mt-1">🎤 Listening for medicine name...</p>
              )}
            </div>

            {/* Medicine List */}
            {searchTerm && (
              <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {loading ? (
                  <p className="p-4 text-gray-500 text-center">Loading medicines...</p>
                ) : filteredMedicines.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No medicines found</p>
                ) : (
                  <div className="divide-y">
                    {sortByFEFO(filteredMedicines).map(medicine => {
                      const batch = medicine.batches && medicine.batches.length > 0 ? medicine.batches[0] : {};
                      return (
                        <button
                          key={medicine._id}
                          onClick={() => {
                            setSelectedMedicine(medicine);
                            setSearchTerm('');
                          }}
                          className="w-full p-4 text-left hover:bg-primary-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800">{medicine.name}</p>
                              <p className="text-sm text-gray-600">{medicine.category}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Batch: {batch.batchNumber || 'N/A'} | Rack: {batch.rackNumber || 'N/A'} | Stock: {medicine.quantity}
                              </p>
                            </div>
                            <p className="font-bold text-primary-600">{formatCurrency(medicine.sellingPrice)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Medicine */}
            {selectedMedicine && (
              <div className="mb-4 p-4 bg-primary-50 border-2 border-primary-200 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{selectedMedicine.name}</p>
                    <p className="text-sm text-gray-600">{selectedMedicine.category}</p>
                  </div>
                  <p className="font-bold text-primary-600">{formatCurrency(selectedMedicine.sellingPrice)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Batch:</span>
                    <span className="ml-2 font-semibold">{selectedMedicine.batches && selectedMedicine.batches[0] ? selectedMedicine.batches[0].batchNumber : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Rack:</span>
                    <span className="ml-2 font-semibold">{selectedMedicine.batches && selectedMedicine.batches[0] ? selectedMedicine.batches[0].rackNumber : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Expiry:</span>
                    <span className="ml-2 font-semibold">{selectedMedicine.batches && selectedMedicine.batches[0] && selectedMedicine.batches[0].expiryDate ? new Date(selectedMedicine.batches[0].expiryDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Available:</span>
                    <span className="ml-2 font-semibold">{selectedMedicine.quantity}</span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max={selectedMedicine.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => isListening && voiceMode === 'quantity' ? stopVoiceInput() : startVoiceInput('quantity')}
                        className={`absolute right-2 top-2 p-1.5 rounded transition-colors ${isListening && voiceMode === 'quantity'
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        title={isListening && voiceMode === 'quantity' ? 'Stop voice input' : 'Voice quantity'}
                      >
                        {isListening && voiceMode === 'quantity' ? <FaStop size={12} /> : <FaMicrophone size={12} />}
                      </button>
                    </div>
                    {isListening && voiceMode === 'quantity' && (
                      <p className="text-xs text-primary-600 mt-1">🎤 Say the quantity number...</p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddItem}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <FaPlus />
                      Add Item
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>💡 CRUD Operations:</strong> ADD items to bill → UPDATE quantity → DELETE unwanted items
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-yellow-800">
                <strong>FEFO Note:</strong> Medicines are automatically sorted by expiry date. Select items with nearest expiry first.
              </p>
            </div>
          </div>

          {/* Right Section - Bill Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaCheck className="text-primary-600" />
              Bill Summary
            </h2>

            {/* Bill Items */}
            <div className="mb-6">
              {billItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">No items added yet</p>
                  <p className="text-xs text-gray-400">Use the form on the left to ADD items</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {billItems.map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                      {editingItem === item.medicineId ? (
                        // EDIT MODE (UPDATE operation)
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-600">
                                Batch: {item.batchNo} | Rack: {item.rackNo}
                              </p>
                            </div>
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">EDITING</span>
                          </div>

                          <div className="flex gap-2 items-end">
                            <div className="flex-1">
                              <label className="text-xs text-gray-600 block mb-1">Update Quantity</label>
                              <input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => handleUpdateItem(item.medicineId)}
                              className="bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1 text-sm"
                            >
                              <FaCheck size={12} />
                              Update
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="bg-gray-400 text-white px-4 py-1.5 rounded hover:bg-gray-500 flex items-center gap-1 text-sm"
                            >
                              <FaTimesCircle size={12} />
                              Cancel
                            </button>
                          </div>

                          <div className="text-xs text-gray-500">
                            New Total: {formatCurrency(item.price * editQuantity)}
                          </div>
                        </div>
                      ) : (
                        // VIEW MODE
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800">{item.name}</p>
                              <p className="text-xs text-gray-600">
                                Batch: {item.batchNo} | Rack: {item.rackNo}
                              </p>
                              <p className="text-xs text-gray-500">Expiry: {item.expiryDate}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingItem(item.medicineId);
                                  setEditQuantity(item.quantity);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded"
                                title="Edit quantity (UPDATE)"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item.medicineId)}
                                className="text-red-600 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                                title="Remove item (DELETE)"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">
                              {formatCurrency(item.price)} × {item.quantity}
                            </span>
                            <span className="font-bold text-primary-600">{formatCurrency(item.total)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* CRUD Operations Legend */}
              {billItems.length > 0 && (
                <div className="mt-3 p-2 bg-gray-100 rounded text-xs space-y-1">
                  <p className="font-semibold text-gray-700">📝 CRUD Operations Available:</p>
                  <div className="flex flex-wrap gap-3 text-gray-600">
                    <span>✅ <strong>ADD:</strong> Use form left</span>
                    <span>✏️ <strong>UPDATE:</strong> Click edit icon</span>
                    <span>🗑️ <strong>DELETE:</strong> Click trash icon</span>
                    <span>👁️ <strong>DISPLAY:</strong> View all items</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bill Totals */}
            {billItems.length > 0 && (
              <>
                <div className="border-t pt-4 mb-4 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>GST (12%):</span>
                    <span className="font-semibold">{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t">
                    <span>Grand Total:</span>
                    <span className="text-primary-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${paymentMethod === 'cash'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-600'
                        }`}
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => setPaymentMethod('gpay')}
                      className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-colors ${paymentMethod === 'gpay'
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-600'
                        }`}
                    >
                      GPay
                    </button>
                  </div>
                </div>

                {/* Complete Payment Button */}
                <button
                  onClick={handlePayment}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
                >
                  Complete Payment
                </button>
              </>
            )}
          </div>
        </div>
      </div>
  );
};

export default Billing;
