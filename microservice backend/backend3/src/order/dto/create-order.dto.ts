import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreateOrderDto {
  @IsNumber()
  productId: number;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsPositive()
  totalPrice: number;

  @IsNumber()
  userId: number;
}
