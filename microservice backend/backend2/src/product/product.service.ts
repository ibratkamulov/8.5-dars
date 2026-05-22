import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(dto);
    return this.productRepository.save(product);
  }

  async findAll(): Promise<Product[]> {
    return this.productRepository.find();
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(`Product #${id} topilmadi`);
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
    return { message: `Product #${id} o'chirildi` };
  }

  // RabbitMQ orqali Order Service chaqiradi
  async reduceStock(productId: number, quantity: number) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) return { success: false, message: 'Mahsulot topilmadi' };
    if (product.stock < quantity) return { success: false, message: "Yetarli stock yo'q" };
    product.stock -= quantity;
    await this.productRepository.save(product);
    return { success: true, message: `Stock kamaytirildi. Qoldi: ${product.stock}` };
  }
}
