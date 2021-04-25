require("dotenv").config();

// Create a connection to the database
const connection = {
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    multipleStatements: true
};

// open the MySQL connection
// connection.connect(error => {
//     if (error) throw error;
//     console.log("Successfully connected to the database.");
// });

module.exports = connection;
