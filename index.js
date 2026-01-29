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

// enables flash messages on session - middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    })
)

app.use(flash());

// to use public CSS and Images folder 
app.use(express.static("public"));

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

// ROUTES
// home page view
app.get("/PawfectCare", function (req, res) {
    res.render('01_home')
})

// Read from bookings table
app.get("/bookings", async function (req, res) {
    try {
        // ---- Read filters from query string ----
        const status = req.query.status?.trim() || "";
        const dateFrom = req.query.dateFrom?.trim() || "";
        const dateTo = req.query.dateTo?.trim() || "";
        const ownerEmail = req.query.ownerEmail?.trim() || "";
        const serviceId = req.query.serviceId?.trim() || "";
        const sort = req.query.sort?.trim() || "";
        const order = req.query.order?.trim() || "asc";

        const filters = { status, dateFrom, dateTo, ownerEmail, serviceId, sort, order };

        
        // ✅ SELECT #1 (for dropdown options)
        const [services] = await dbConnection.query(
            "SELECT serviceId, serviceName FROM services ORDER BY serviceName"
        );

        // ✅ SELECT #2 (bookings list with filters)
        let sql = `
      SELECT
        b.bookingId,
        b.bookingDate,
        b.startTime,
        b.endTime,
        b.status,

        o.firstName AS ownerFirstName,
        o.lastName  AS ownerLastName,
        o.email     AS ownerEmail,
        o.phone     AS ownerPhone,

        p.petName   AS petName,
        p.species   AS species,

        COALESCE(GROUP_CONCAT(DISTINCT s.serviceName ORDER BY s.serviceName SEPARATOR ', '), 'No Services') AS serviceNames

      FROM bookings b
      JOIN owners o ON b.ownerId = o.ownerId
      JOIN pets p   ON b.petId   = p.petId
      LEFT JOIN bookingServices bs ON b.bookingId = bs.bookingId
      LEFT JOIN services s         ON bs.serviceId = s.serviceId
    `;

        const where = [];
        const params = [];

        if (status) {
            where.push("b.status = ?");
            params.push(status);
        }

        // Date range (best practice: allow From-only, To-only, or both)
        if (dateFrom) {
            where.push("b.bookingDate >= ?");
            params.push(dateFrom);
        }
        if (dateTo) {
            where.push("b.bookingDate <= ?");
            params.push(dateTo);
        }

        if (ownerEmail) {
            where.push("o.email LIKE ?");
            params.push(`%${ownerEmail}%`);
        }

        if (serviceId && /^\d+$/.test(serviceId)) {
            where.push("bs.serviceId = ?");
            params.push(parseInt(serviceId, 10));
        }

        if (where.length > 0) {
            sql += " WHERE " + where.join(" AND ");
        }

        sql += `
      GROUP BY
        b.bookingId, b.bookingDate, b.startTime, b.endTime, b.status,
        o.firstName, o.lastName, o.email, o.phone,
        p.petName, p.species
      ORDER BY b.bookingId DESC
    `;

        const [rows] = await dbConnection.query(sql, params);

        // Flash: read once, then clear
        const flashMessage = req.session.flashMessage || null;
        req.session.flashMessage = null;

        res.render("05_bookings_index", {
            bookings: rows,
            services,
            filters,
            flashMessage
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading bookings");
    }
});


// Route for listing services in Add new booking
app.get("/bookings/new", async function (req, res) {
    const sql = "SELECT serviceId, serviceName FROM services ORDER BY serviceName";
    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render("06_bookings_new", {
        services: rows
    });
});

// Read from services table
app.get("/services", async function (req, res) {
    const sql = 'SELECT * FROM services'
    const results = await dbConnection.query(sql);
    const rows = results[0];

    res.render('11_services_index', {
        services: rows
    })
});

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
});

// Create new booking 
app.post("/bookings/create", async (req, res) => {
    try {
        const {
            bookingDate,
            startTime,
            status,
            petName,
            species,
            ownerFirstName,
            ownerLastName,
            ownerEmail,
            ownerPhone
        } = req.body;

        const endTime = req.body.endTime && String(req.body.endTime).trim() !== ""
            ? req.body.endTime
            : null;

        // services from checklist
        let serviceIds = req.body.serviceIds;

        // normalize to array
        if (Array.isArray(serviceIds)) {
            // ok
        } else if (serviceIds) {
            serviceIds = [serviceIds];
        } else {
            serviceIds = [];
        }

        // remove blanks + non-numbers, convert to integers
        serviceIds = serviceIds
            .map(v => String(v).trim())
            .filter(v => v !== "" && /^\d+$/.test(v))
            .map(v => parseInt(v, 10));

        if (serviceIds.length === 0) {
            req.session.flashMessage = "Please select at least one service.";
            return res.redirect("/bookings/new");
        }

        // check and reuse owners
        const [ownerRows] = await dbConnection.query(
            "SELECT ownerId FROM owners WHERE email = ? OR phone = ? LIMIT 1",
            [ownerEmail, ownerPhone]
        );

        let ownerId;
        if (ownerRows.length > 0) {
            ownerId = ownerRows[0].ownerId;
        } else {
            const [ownerResult] = await dbConnection.query(
                "INSERT INTO owners (firstName, lastName, email, phone) VALUES (?, ?, ?, ?)",
                [ownerFirstName, ownerLastName, ownerEmail, ownerPhone]
            );
            ownerId = ownerResult.insertId;
        }

        // check and reuse pets
        const [petRows] = await dbConnection.query(
            "SELECT petId FROM pets WHERE petName = ? AND ownerId = ? LIMIT 1",
            [petName, ownerId]
        );

        let petId;
        if (petRows.length > 0) {
            petId = petRows[0].petId;
        } else {
            const [petResult] = await dbConnection.query(
                "INSERT INTO pets (petName, species, ownerId) VALUES (?, ?, ?)",
                [petName, species, ownerId]
            );
            petId = petResult.insertId;
        }

        // create booking
        const [bookingResult] = await dbConnection.query(
            `INSERT INTO bookings
       (bookingDate, startTime, endTime, status, ownerId, petId)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [bookingDate, startTime, endTime, status, ownerId, petId]
        );

        const bookingId = bookingResult.insertId;

        // insert to bookingServices
        for (const serviceId of serviceIds) {
            await dbConnection.query(
                "INSERT INTO bookingServices (bookingId, serviceId) VALUES (?, ?)",
                [bookingId, serviceId]
            );
        }

        // success flash message
        req.session.flashMessage = `Booking ${bookingId} is successfully created`;
        res.redirect("/bookings");

    } catch (err) {
        console.error(err);
        res.status(500).send("Error create booking");
    }
});

// edit booking - fill form with existing details 
app.get("/bookings/:bookingId/edit", async (req, res) => {
    try {
        const bookingId = req.params.bookingId;

        // 1) booking details + owner + pet
        const bookingSql = `
      SELECT
        b.bookingId,
        b.bookingDate,
        b.startTime,
        b.endTime,
        b.status,

        o.firstName AS ownerFirstName,
        o.lastName  AS ownerLastName,
        o.email     AS ownerEmail,
        o.phone     AS ownerPhone,

        p.petName   AS petName,
        p.species   AS species
      FROM bookings b
      JOIN owners o ON b.ownerId = o.ownerId
      JOIN pets p   ON b.petId   = p.petId
      WHERE b.bookingId = ?
      LIMIT 1
    `;
        const [bookingRows] = await dbConnection.query(bookingSql, [bookingId]);
        if (bookingRows.length === 0) return res.status(404).send("Booking not found");

        // 2) all services
        const [services] = await dbConnection.query(
            "SELECT serviceId, serviceName FROM services ORDER BY serviceName"
        );

        // 3) selected services for this booking
        const [selectedRows] = await dbConnection.query(
            "SELECT serviceId FROM bookingServices WHERE bookingId = ?",
            [bookingId]
        );
        const selectedServiceIds = selectedRows.map(r => r.serviceId);

        res.render("07_bookings_edit", {
            booking: bookingRows[0],
            services,
            selectedServiceIds
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading edit page");
    }
});

// post edited booking - replace the booking details with edit
app.post("/bookings/:bookingId/update", async (req, res) => {
    try {
        const bookingId = req.params.bookingId;

        const {
            bookingDate,
            startTime,
            status,
            petName,
            species,
            ownerFirstName,
            ownerLastName,
            ownerEmail,
            ownerPhone
        } = req.body;

        const endTime = req.body.endTime && String(req.body.endTime).trim() !== ""
            ? req.body.endTime
            : null;

        // serviceIds sanitise
        let serviceIds = req.body.serviceIds;
        if (Array.isArray(serviceIds)) {
            // ok
        } else if (serviceIds) {
            serviceIds = [serviceIds];
        } else {
            serviceIds = [];
        }

        serviceIds = serviceIds
            .map(v => String(v).trim())
            .filter(v => v !== "" && /^\d+$/.test(v))
            .map(v => parseInt(v, 10));

        if (serviceIds.length === 0) {
            req.session.flashMessage = "Please select at least one service.";
            return res.redirect(`/bookings/${bookingId}/edit`);
        }

        // Get ownerId + petId for this booking
        const [idRows] = await dbConnection.query(
            "SELECT ownerId, petId FROM bookings WHERE bookingId = ? LIMIT 1",
            [bookingId]
        );
        if (idRows.length === 0) return res.status(404).send("Booking not found");

        const ownerId = idRows[0].ownerId;
        const petId = idRows[0].petId;

        // Update bookings
        await dbConnection.query(
            "UPDATE bookings SET bookingDate = ?, startTime = ?, endTime = ?, status = ? WHERE bookingId = ?",
            [bookingDate, startTime, endTime, status, bookingId]
        );

        // Update owner
        await dbConnection.query(
            "UPDATE owners SET firstName = ?, lastName = ?, email = ?, phone = ? WHERE ownerId = ?",
            [ownerFirstName, ownerLastName, ownerEmail, ownerPhone, ownerId]
        );

        // Update pet
        await dbConnection.query(
            "UPDATE pets SET petName = ?, species = ? WHERE petId = ?",
            [petName, species, petId]
        );

        // Replace bookingServices
        await dbConnection.query("DELETE FROM bookingServices WHERE bookingId = ?", [bookingId]);

        for (const serviceId of serviceIds) {
            await dbConnection.query(
                "INSERT INTO bookingServices (bookingId, serviceId) VALUES (?, ?)",
                [bookingId, serviceId]
            );
        }

        req.session.flashMessage = `Booking ${bookingId} is successfully updated`;
        res.redirect("/bookings");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating booking");
    }
});

// delete from bookings table
// get route to display first
app.get("/bookings/:bookingId/delete", async (req, res) => {
    try {
        const bookingId = req.params.bookingId;

        const sql = `
      SELECT
        b.bookingId,
        b.bookingDate,
        b.startTime,
        b.endTime,
        b.status,
        p.petName,
        p.species AS species,
        o.firstName AS ownerFirstName,
        o.lastName  AS ownerLastName
      FROM bookings b
      JOIN owners o ON b.ownerId = o.ownerId
      JOIN pets p   ON b.petId   = p.petId
      WHERE b.bookingId = ?
    `;

        const [rows] = await dbConnection.query(sql, [bookingId]);

        if (rows.length === 0) return res.status(404).send("Booking not found");

        res.render("08_bookings_delete", { booking: rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading delete confirmation");
    }
});

// Bookings Post - delete route 
app.post("/bookings/:bookingId/delete", async (req, res) => {
    try {
        const bookingId = req.params.bookingId;

        // FK default is RESTRICT/NO ACTION, so delete child rows first
        await dbConnection.query(
            "DELETE FROM bookingServices WHERE bookingId = ?",
            [bookingId]
        );

        const [result] = await dbConnection.query(
            "DELETE FROM bookings WHERE bookingId = ?",
            [bookingId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send("Booking not found");
        }
        // Flash message
        req.session.flashMessage = `Booking ${bookingId} is successfully deleted`;

        res.redirect("/bookings");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting booking");
    }
});

app.listen(3000, () => {
    console.log('server is running');
})