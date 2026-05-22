# Backend2 — Product Service

Port: **3000**

## Endpoints
- POST   /products
- GET    /products
- GET    /products/:id
- PUT    /products/:id
- DELETE /products/:id

## RabbitMQ
- Queue: `product_queue`
- Pattern: `reduce_stock`

## Setup
```bash
npm install
npm run start:dev
```
