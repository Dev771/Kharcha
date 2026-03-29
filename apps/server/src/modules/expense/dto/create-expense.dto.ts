import {
  IsInt,
  IsPositive,
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsDateString,
  MaxLength,
  Max,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SplitEntryDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    description:
      'Paise amount (EXACT), percentage (PERCENTAGE), or share ratio (SHARES)',
  })
  @IsOptional()
  value?: number;
}

export class CreateExpenseDto {
  @ApiProperty({
    example: 350000,
    description: 'Amount in paise (Rs 3,500.00 = 350000)',
  })
  @IsInt()
  @IsPositive()
  @Max(2000000000, { message: 'Amount cannot exceed Rs 2,00,00,000 (2 crore)' })
  amountInPaise!: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string = 'INR';

  @ApiProperty({ example: 'Dinner at Olive Bar' })
  @IsString()
  @MaxLength(500)
  description!: string;

  @ApiPropertyOptional({ example: 'food' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: ['dining', 'goa'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] })
  @IsEnum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])
  splitType!: string;

  @ApiProperty({ example: '2026-03-28' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'UUID of the user who paid' })
  @IsUUID()
  paidById!: string;

  @ApiProperty({ type: [SplitEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits!: SplitEntryDto[];

  @ApiPropertyOptional({
    description: 'Client-generated key for idempotent creation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}
