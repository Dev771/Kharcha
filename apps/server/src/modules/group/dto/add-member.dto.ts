import { IsEmail, IsArray, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMemberDto {
  @ApiProperty({ example: 'friend@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;
}

export class AddMembersDto {
  @ApiProperty({ example: ['friend1@example.com', 'friend2@example.com'] })
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayMaxSize(20)
  emails!: string[];
}
