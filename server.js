require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const indexRouter = require('./routes/research');




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('path', __dirname + '/public');


const connectDB = require('./config/db');

connectDB();

app.use('/', indexRouter);


// Global error handler for all unhandled errors
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
