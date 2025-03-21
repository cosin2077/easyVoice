import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0', // 指定 OpenAPI 版本
    info: {
      title: '@easy-voice/backend API', // API 标题
      version: '0.0.3', // 从 package.json 中获取版本
      description: 'API documentation for the Easy Voice backend', // API 描述
    },
    servers: [
      {
        url: 'http://localhost:3000', // 本地开发服务器地址
        description: 'Development server',
      },
    ],
  },
  // 指定扫描的路由文件路径，支持多文件
  apis: ['./src/routes/*.ts', './src/**/*.ts'], // 假设你的路由文件在 src/routes 目录下
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
