import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,

    @Inject('PRODUCT_SERVICE')
    private productClient: ClientProxy,
  ) {}

  async create(dto: CreateOrderDto): Promise<Order> {
    // 1. Buyurtmani PENDING holatida saqlash
    const order = this.orderRepository.create({ ...dto, status: OrderStatus.PENDING });
    await this.orderRepository.save(order);

    try {
      // 2. RabbitMQ orqali Product Service ga xabar yuborish
      console.log(`[RabbitMQ] reduce_stock yuborilmoqda: product=${dto.productId}, qty=${dto.quantity}`);
      const result = await firstValueFrom(
        this.productClient.send('reduce_stock', {
          productId: dto.productId,
          quantity: dto.quantity,
        }),
      );

      // 3. Javobga qarab holatni yangilash
      order.status = result.success ? OrderStatus.CONFIRMED : OrderStatus.FAILED;
      console.log(`[Order #${order.id}] ${order.status.toUpperCase()} — ${result.message}`);
    } catch (error) {
      order.status = OrderStatus.FAILED;
      console.error(`[Order #${order.id}] FAILED — RabbitMQ xatosi:`, error.message);
    }

    return this.orderRepository.save(order);
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Order> {
    return this.orderRepository.findOne({ where: { id } });
  }

  async findByUser(userId: number): Promise<Order[]> {
    return this.orderRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
