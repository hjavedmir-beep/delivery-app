const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'orders.json');
const DRIVERS_DATA_FILE = path.join(__dirname, 'drivers.json');
const BUSINESSES_DATA_FILE = path.join(__dirname, 'businesses.json');

function readOrders() {
    if (!fs.existsSync(DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveOrders(orders) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function readDrivers() {
    if (!fs.existsSync(DRIVERS_DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(DRIVERS_DATA_FILE, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveDrivers(drivers) {
    fs.writeFileSync(DRIVERS_DATA_FILE, JSON.stringify(drivers, null, 2), 'utf8');
}

function readBusinesses() {
    if (!fs.existsSync(BUSINESSES_DATA_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(BUSINESSES_DATA_FILE, 'utf8'));
    } catch (err) {
        return [];
    }
}

function saveBusinesses(businesses) {
    fs.writeFileSync(BUSINESSES_DATA_FILE, JSON.stringify(businesses, null, 2), 'utf8');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// کسٹمر ٹریکنگ پیج کے لیے
app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'track.html'));
});

// --- Orders APIs ---
app.get('/api/orders', (req, res) => {
    res.json(readOrders());
});

app.post('/api/orders', (req, res) => {
    const orders = readOrders();
    const newOrder = {
        id: Date.now().toString().slice(-4),
        customerName: req.body.customerName,
        customerPhone: req.body.customerPhone,
        pickupAddress: req.body.pickupAddress,
        dropoffAddress: req.body.dropoffAddress,
        notes: req.body.notes || req.body.specialNotes || '',
        status: 'Pending Assignment',
        assignedDriverId: null,
        deliveryPrice: req.body.deliveryPrice || 5.00
    };

    orders.push(newOrder);
    saveOrders(orders);
    res.status(201).json({ message: 'Order created', order: newOrder });
});

app.post('/api/orders/assign', (req, res) => {
    const orders = readOrders();
    const order = orders.find(o => String(o.id) === String(req.body.orderId));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.assignedDriverId = req.body.driverId;
    order.status = `Assigned to Driver ${req.body.driverId}`;
    saveOrders(orders);
    res.json({ message: 'Assigned', order });
});

app.post('/api/orders/status', (req, res) => {
    const orders = readOrders();
    const order = orders.find(o => String(o.id) === String(req.body.orderId));
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = req.body.status;
    saveOrders(orders);
    res.json({ message: 'Status updated', order });
});

// Delete an order (used when clearing completed orders)
app.delete('/api/orders/:id', (req, res) => {
    let orders = readOrders();
    orders = orders.filter(o => String(o.id) !== String(req.params.id));
    saveOrders(orders);
    res.json({ success: true, message: 'Order deleted' });
});

// --- Businesses APIs ---
app.get('/api/businesses', (req, res) => {
    res.json(readBusinesses());
});

app.post('/api/businesses', (req, res) => {
    const businesses = readBusinesses();
    const newBusiness = {
        id: Date.now().toString().slice(-4),
        name: req.body.name,
        phone: req.body.phone,
        address1: req.body.address1,
        address2: req.body.address2 || '',
        postcode: req.body.postcode,
        area: req.body.area,
        lat: req.body.lat,
        lng: req.body.lng
    };

    businesses.push(newBusiness);
    saveBusinesses(businesses);
    res.status(201).json({ success: true, message: 'Business created', business: newBusiness });
});

app.delete('/api/businesses/:id', (req, res) => {
    let businesses = readBusinesses();
    businesses = businesses.filter(b => String(b.id) !== String(req.params.id));
    saveBusinesses(businesses);
    res.json({ success: true, message: 'Business deleted' });
});

// --- Drivers Signup & Management APIs ---
app.post('/api/drivers/signup', (req, res) => {
    const drivers = readDrivers();
    const newDriver = {
        id: String(Math.floor(100 + Math.random() * 900)),
        firstName: req.body.firstName,
        surname: req.body.surname,
        mobile: req.body.mobile,
        address: req.body.address,
        password: req.body.password,
        status: 'Pending' // ایڈمن کی منظوری کے لیے
    };

    drivers.push(newDriver);
    saveDrivers(drivers);
    res.status(201).json({ message: 'Driver sign up request submitted successfully', driver: newDriver });
});

app.get('/api/drivers', (req, res) => {
    res.json(readDrivers());
});

app.post('/api/drivers/status', (req, res) => {
    const drivers = readDrivers();
    const driver = drivers.find(d => String(d.id) === String(req.body.driverId));
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.status = req.body.status; // 'Approved'
    saveDrivers(drivers);
    res.json({ message: 'Driver status updated', driver });
});

// Added compatibility endpoint for admin panel driver approvals
app.post('/api/drivers/approve', (req, res) => {
    const drivers = readDrivers();
    const driver = drivers.find(d => String(d.id) === String(req.body.driverId));
    if (!driver) return res.status(404).json({ error: 'Driver not found' });

    driver.status = 'Approved';
    saveDrivers(drivers);
    res.json({ success: true, message: 'Driver approved', driver });
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
