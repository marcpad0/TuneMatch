// swagger.js
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'User Management API',
            version: '1.0.0',
            description: 'API for managing users with registration, login, and CRUD operations',
            contact: {
                name: 'Marco',
                email: 'your.email@example.com',
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Local server',
                },
            ],
        },
        components: {
            securitySchemes: {
                
            },
        },
        security: [
            
        ],
    },
    apis: [path.join(__dirname, 'server.js')], 
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

module.exports = {
    swaggerUi,
    swaggerDocs,
};
