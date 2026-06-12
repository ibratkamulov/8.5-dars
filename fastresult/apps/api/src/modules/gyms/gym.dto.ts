import { IsOptional, IsString } from "class-validator";

export class GymDto {
  declare id: string;
  declare name: string;
  declare address: string;
  declare lat: number;
  declare lon: number;
  declare phone?: string;
  declare website?: string;
  declare openingHours?: string;
  declare source: "osm";
}

export class SearchGymsQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  q?: string;
}
