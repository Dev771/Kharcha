import {
  IsUUID,
  IsInt,
  IsPositive,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementDto {
  @ApiProperty({ description: 'User who is paying' })
  @IsUUID()
  paidById!: string;

  @ApiProperty({ description: 'User who is receiving payment' })
  @IsUUID()
  paidToId!: string;

  @ApiProperty({ example: 200000, description: 'Amount in paise' })
  @IsInt()
  @IsPositive()
  @Max(2000000000, { message: 'Amount cannot exceed Rs 2,00,00,000 (2 crore)' })
  amountInPaise!: number;

  @ApiPropertyOptional({ example: 'Settling up for the trip' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
