require('dotenv').config({ quiet: true });
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const indexRouter = require('./routes/research');




app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static('public'));


const connectDB = require('./config/db');

connectDB();

app.use('/', indexRouter);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));


// Global error handler for all unhandled errors
app.use((err, req, res, next) => {
    console.error(`[server] ${err.message}`);
    res.status(err.status || 500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
