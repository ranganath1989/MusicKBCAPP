require('dotenv').config();  
const express = require('express');  
const bodyParser = require('body-parser');  
const cors = require('cors');  
const connectDB = require('./config/db');  
const questionRoutes = require('./routes/questionRoutes');  
const swaggerUi = require('swagger-ui-express');  
const YAML = require('yamljs');  
  
const app = express();  
  
// Connect to DB  
connectDB();  
  
// Middleware  
app.use(bodyParser.json());  
app.use(cors());  
  
// API Versioning  
const apiVersion = 'v1'; // Define your API version  
  
// Routes  
app.use(`/api/${apiVersion}/questions`, questionRoutes);  
  
// Swagger UI  
const swaggerDocument = YAML.load('./openapi.yaml');  
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));  
  
// Global Error Handling Middleware  
app.use((err, req, res, next) => {  
    console.error(err.stack);  
    res.status(500).send('Something broke!');  
});  
  
// Port Configuration  
const PORT = process.env.PORT || 5000;  
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));