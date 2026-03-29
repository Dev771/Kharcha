import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MessageTypeDto {
  TEXT = 'TEXT',
  SYSTEM = 'SYSTEM',
  EXPENSE_LINK = 'EXPENSE_LINK',
  SETTLEMENT_LINK = 'SETTLEMENT_LINK',
}

export class CreateMessageDto {
  @ApiProperty({ description: 'Message content', maxLength: 2000 })
  @IsString()
  @MaxLength(2000)
  content!: string;

  @ApiPropertyOptional({ enum: MessageTypeDto, default: MessageTypeDto.TEXT })
  @IsOptional()
  @IsEnum(MessageTypeDto)
  type?: MessageTypeDto;
}
