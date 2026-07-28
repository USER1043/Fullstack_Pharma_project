import mongoose from 'mongoose';

// Supplier Schema
const supplierSchema = new mongoose.Schema(
  {
    supplier_name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      unique: true,
    },
    contact_info: {
      phone: {
        type: String,
        required: [true, 'Phone number is required'],
      },
      email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
      },
      address: {
        type: String,
        required: true,
      },
      city: String,
      state: String,
      pincode: String,
    },
    delivery_performance_score: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 10,
    },
    total_orders: {
      type: Number,
      default: 0,
    },
    successful_deliveries: {
      type: Number,
      default: 0,
    },
    medicine_categories: [{ type: String }],
    registration_date: {
      type: Date,
      default: Date.now,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    notes: String,
  },
  { timestamps: true }
);

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema(
  {
    order_number: {
      type: String,
      unique: true,
      required: true,
    },
    medicine_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medicine',
      required: true,
    },
    medicine_name: String,
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    requested_quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit_price: {
      type: Number,
      required: true,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    order_status: {
      type: String,
      enum: ['AI_Draft', 'Pending', 'Approved', 'Ordered', 'Shipped', 'Received', 'Cancelled', 'Adjusted'],
      default: 'Pending',
    },
    expected_delivery_date: {
      type: Date,
      required: true,
    },
    actual_delivery_date: Date,
    received_quantity: Number,
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: String,
    ai_forecast_reference: {
      demand_predicted: Number,
      forecast_date: Date,
      priority: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
      }
    },
  },
  { timestamps: true }
);

const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);

export { Supplier, PurchaseOrder };
