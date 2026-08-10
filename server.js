const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'orders.json');
const DRIVERS_DATA_FILE = path.join(__dirname, 'drivers.json');

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
        notes: req.body.notes || '',
        status: 'Pending Assignment',
        assignedDriverId: null,
        deliveryFee: 5.00
    };

    orders.push(newOrder);
    saveOrders(orders);
    res.status(201).json({ message: 'Order created', order: newOrder });
});

app.post('/api/orders/assign', (req, res) => {
    const orders = readOrders();
    const order = orders.find(o => o.id === req.body.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.assignedDriverId = req.body.driverId;
    order.status = `Assigned to Driver ${req.body.driverId}`;
    saveOrders(orders);
    res.json({ message: 'Assigned', order });
});

app.post('/api/orders/status', (req, res) => {
    const orders = readOrders();
    const order = orders.find(o => o.id === req.body.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    order.status = req.body.status;
    saveOrders(orders);
    res.json({ message: 'Status updated', order });
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
