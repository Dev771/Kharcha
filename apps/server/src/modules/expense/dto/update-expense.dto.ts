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
import { ApiPropertyOptional } from '@nestjs/swagger';

class SplitEntryDto {
  @ApiPropertyOptional()
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  value?: number;
}

export class UpdateExpenseDto {
  @ApiPropertyOptional({ example: 350000 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  @Max(2000000000)
  amountInPaise?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'food' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ enum: ['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'] })
  @IsOptional()
  @IsEnum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'])
  splitType?: string;

  @ApiPropertyOptional({ example: '2026-03-28' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  paidById?: string;

  @ApiPropertyOptional({ type: [SplitEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits?: SplitEntryDto[];
}
