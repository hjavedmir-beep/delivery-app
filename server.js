const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// MongoDB Atlas کنکشن
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB Atlas successfully!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Schemas & Models ---
const orderSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    customerName: String,
    customerPhone: String,
    pickupAddress: String,
    dropoffAddress: String,
    notes: String,
    status: String,
    assignedDriverId: String,
    deliveryPrice: Number
});
const Order = mongoose.model('Order', orderSchema);

const driverSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    firstName: String,
    surname: String,
    mobile: String,
    address: String,
    password: String,
    status: String
});
const Driver = mongoose.model('Driver', driverSchema);

const businessSchema = new mongoose.Schema({
    id: { type: String, unique: true },
    name: String,
    phone: String,
    address1: String,
    address2: String,
    postcode: String,
    area: String,
    lat: Number,
    lng: Number
});
const Business = mongoose.model('Business', businessSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'track.html'));
});

// --- Orders APIs ---
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order({
            id: Date.now().toString().slice(-4),
            customerName: req.body.customerName,
            customerPhone: req.body.customerPhone,
            pickupAddress: req.body.pickupAddress,
            dropoffAddress: req.body.dropoffAddress,
            notes: req.body.notes || req.body.specialNotes || '',
            status: 'Pending Assignment',
            assignedDriverId: null,
            deliveryPrice: req.body.deliveryPrice || 5.00
        });
        await newOrder.save();
        res.status(201).json({ message: 'Order created', order: newOrder });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/assign', async (req, res) => {
    try {
        const order = await Order.findOne({ id: String(req.body.orderId) });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.assignedDriverId = req.body.driverId;
        order.status = `Assigned to Driver ${req.body.driverId}`;
        await order.save();
        res.json({ message: 'Assigned', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/orders/status', async (req, res) => {
    try {
        const order = await Order.findOne({ id: String(req.body.orderId) });
        if (!order) return res.status(404).json({ error: 'Order not found' });

        order.status = req.body.status;
        await order.save();
        res.json({ message: 'Status updated', order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        await Order.findOneAndDelete({ id: String(req.params.id) });
        res.json({ success: true, message: 'Order deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Businesses APIs ---
app.get('/api/businesses', async (req, res) => {
    try {
        const businesses = await Business.find();
        res.json(businesses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/businesses', async (req, res) => {
    try {
        const newBusiness = new Business({
            id: Date.now().toString().slice(-4),
            name: req.body.name,
            phone: req.body.phone,
            address1: req.body.address1,
            address2: req.body.address2 || '',
            postcode: req.body.postcode,
            area: req.body.area,
            lat: req.body.lat,
            lng: req.body.lng
        });
        await newBusiness.save();
        res.status(201).json({ success: true, message: 'Business created', business: newBusiness });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/businesses/:id', async (req, res) => {
    try {
        await Business.findOneAndDelete({ id: String(req.params.id) });
        res.json({ success: true, message: 'Business deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Drivers Signup & Management APIs ---
app.post('/api/drivers/signup', async (req, res) => {
    try {
        const newDriver = new Driver({
            id: String(Math.floor(100 + Math.random() * 900)),
            firstName: req.body.firstName,
            surname: req.body.surname,
            mobile: req.body.mobile,
            address: req.body.address,
            password: req.body.password,
            status: 'Pending'
        });
        await newDriver.save();
        res.status(201).json({ message: 'Driver sign up request submitted successfully', driver: newDriver });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/drivers', async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.json(drivers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers/status', async (req, res) => {
    try {
        const driver = await Driver.findOne({ id: String(req.body.driverId) });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        driver.status = req.body.status;
        await driver.save();
        res.json({ message: 'Driver status updated', driver });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/drivers/approve', async (req, res) => {
    try {
        const driver = await Driver.findOne({ id: String(req.body.driverId) });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });

        driver.status = 'Approved';
        await driver.save();
        res.json({ success: true, message: 'Driver approved', driver });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Live Location Tracking ---
let driverLocations = {};

app.post('/api/driver/location', (req, res) => {
    const { driverId, lat, lng } = req.body;
    if (driverId && lat && lng) {
        driverLocations[driverId] = { lat, lng, updatedAt: new Date() };
        res.json({ success: true, message: 'Location updated successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid data' });
    }
});

app.get('/api/drivers/locations', (req, res) => {
    res.json(driverLocations);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
