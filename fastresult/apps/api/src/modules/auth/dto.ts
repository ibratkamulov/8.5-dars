import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

const authRoles = ["SUPER_ADMIN", "GYM_OWNER", "TRAINER", "MEMBER"] as const;
const createableRoles = ["GYM_OWNER", "TRAINER", "MEMBER"] as const;

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(authRoles)
  role!: (typeof authRoles)[number];
}

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(createableRoles)
  role!: (typeof createableRoles)[number];
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
