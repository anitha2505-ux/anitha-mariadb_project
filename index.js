const express = require("express");
// ejs is embedded JavaScript (is a way to create templates for a dynamic web app)
// a template file is a reusable HTML code which express can
// send back to the client
const ejs = require("ejs");
const expressLayouts = require("express-ejs-layouts");
// mysql2 is a NodeJS client to do CRUD with MySQL/MariaDB
const mysql2 = require("mysql2/promise");
require("dotenv").config();

const app = express();
const port = 3000;

//setup Flash
const session = require("express-session");
const flash = require("connect-flash");
const { createPool } = require("mysql2");

// setup EJS
app.set("view engine", "ejs");
app.set("views", "./views");

//layout setup 
app.use(expressLayouts);
app.set("layout", "03_layout");

// enables form processing on the server side
app.use(express.urlencoded({
    extended: true
}))

// enables flash messages on session
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
)

app.use(flash());

//make flash messages available for EJS pages

app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// define a global title once 
app.use((req, res, next) => {
    res.locals.title = "PawfectCare";
    next();
});

// create a connection pool
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}

const dbConnection = mysql2.createPool(dbConfig);
// home page view

app.get("/PawfectCare", function (req, res) {
    res.render('01_home')
})

// Read from bookings table
app.get("/bookings", async function (req, res) {
    const sql = `SELECT 
        b.bookingId,
        b.bookingDate,
        b.startTime,
        b.endTime,
        b.status,

        s.serviceName AS serviceName,

        o.firstName AS ownerFirstName,
        o.lastName AS ownerlastName,
        o.email AS ownerEmail,
        o.phone AS ownerPhone,

        p.petName AS petName,
        p.species AS species

      FROM bookings b
      JOIN owners o ON b.ownerId = o.ownerId
      JOIN pets p ON b.petId = p.petId
      LEFT JOIN bookingServices bs ON b.bookingId = bs.bookingId
      LEFT JOIN services s ON bs.serviceId = s.serviceId

      ORDER BY b.bookingId DESC;`

    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render('05_bookings_index', {
        bookings: rows
    })
})

// Read from services table
app.get("/services", async function (req, res) {
    const sql = 'SELECT * FROM services'
    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render('11_services_index', {
        services: rows
    })
})

// Read from pets table
app.get("/pets", async function (req, res) {
    const sql = 'SELECT * FROM pets'
    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render('10_pets_index', {
        pets: rows
    })
})

// read from owners table
app.get("/owners", async function (req, res) {
    const sql = 'SELECT * FROM owners'
    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render('09_owners_index', {
        owners: rows
    })
})

app.get("/bookings/new", function (req, res) {
    res.render("06_bookings_new");
})


app.listen(3000, () => {
    console.log('server is running');
})