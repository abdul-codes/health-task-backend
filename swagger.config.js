const swaggerConfig = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MedicTask API',
      version: '1.0.0',
      description: `
        Medical task management system API for MedicTask mobile application.
        
        ## Authentication
        All endpoints (except /api/auth/login, /api/auth/register) require Bearer token authentication.
        Include the Authorization header in your requests:
        
        \`\`\`
        Authorization: Bearer YOUR_ACCESS_TOKEN
        \`\`\`
        
        ## User Roles
        - ADMIN: Full access to all resources
        - DOCTOR: Create tasks, patients, view all data
        - NURSE: View assigned tasks/patients, update task status
        - LABTECH: View assigned tasks/patients, update task status
      `,
      contact: {
        name: 'MedicTask Support',
        email: 'support@medictask.com'
      },
      servers: [
        {
          url: process.env.API_URL || 'http://localhost:8000',
          description: 'Development server'
        },
        {
          url: process.env.PRODUCTION_API_URL || 'https://medictask-backend.vercel.app',
          description: 'Production server'
        }
      ]
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using Bearer scheme'
        }
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Human-readable error message'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Validation error details'
              }
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'admin@medic.com'
            },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'User password (minimum 8 characters)',
              example: 'Admin123!@#'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'User unique identifier',
              example: 'clx123abc'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'admin@medic.com'
            },
            firstName: {
              type: 'string',
              description: 'User first name',
              example: 'Sarah'
            },
            lastName: {
              type: 'string',
              description: 'User last name',
              example: 'Johnson'
            },
            role: {
              type: 'string',
              enum: ['ADMIN', 'DOCTOR', 'NURSE', 'LABTECH'],
              description: 'User role in system',
              example: 'ADMIN'
            }
          }
        }
      }
    },
    apis: [
      './src/routes/*.js',
      './src/controller/*.js'
    ],
    basedir: __dirname,
  };
  
  module.exports = swaggerConfig;
