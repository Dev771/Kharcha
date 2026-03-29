import {
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
  IsArray,
  IsEmail,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Goa Trip 2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Annual beach trip with friends' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    example: ['friend@example.com'],
    description: 'Emails of registered users to add during creation',
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(20)
  memberEmails?: string[];
}
