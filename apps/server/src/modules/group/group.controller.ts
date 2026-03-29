import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GroupService } from './group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { AddMemberDto, AddMembersDto } from './dto/add-member.dto';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group (creator becomes ADMIN)' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupDto,
  ) {
    return this.groupService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all groups for the current user' })
  async list(@CurrentUser('id') userId: string) {
    return this.groupService.listForUser(userId);
  }

  @Get(':groupId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group details with member list' })
  async getDetail(@Param('groupId') groupId: string) {
    return this.groupService.getDetail(groupId);
  }

  @Patch(':groupId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Update group (admin only)' })
  async update(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
    @Req() req: any,
  ) {
    return this.groupService.update(groupId, dto, req.groupRole);
  }

  @Post(':groupId/archive')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Archive group (admin only)' })
  async archive(@Param('groupId') groupId: string, @Req() req: any) {
    return this.groupService.archive(groupId, req.groupRole);
  }

  @Get(':groupId/invite')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Get group invite code' })
  async getInvite(@Param('groupId') groupId: string) {
    return this.groupService.getInviteCode(groupId);
  }

  @Post(':groupId/invite/regenerate')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Regenerate invite code (admin only)' })
  async regenerateInvite(
    @Param('groupId') groupId: string,
    @Req() req: any,
  ) {
    return this.groupService.regenerateInviteCode(groupId, req.groupRole);
  }

  @Post('join/:inviteCode')
  @ApiOperation({ summary: 'Join a group via invite code' })
  async join(
    @CurrentUser('id') userId: string,
    @Param('inviteCode') inviteCode: string,
  ) {
    return this.groupService.joinByInviteCode(userId, inviteCode);
  }

  // ─── Member Management ───

  @Post(':groupId/members')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Add a member by email (admin only)' })
  async addMember(
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberDto,
    @Req() req: any,
  ) {
    return this.groupService.addMemberByEmail(
      groupId,
      dto.email,
      req.groupRole,
    );
  }

  @Post(':groupId/members/bulk')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Add multiple members by email (admin only)' })
  async addMembers(
    @Param('groupId') groupId: string,
    @Body() dto: AddMembersDto,
    @Req() req: any,
  ) {
    if (req.groupRole !== 'ADMIN') {
      throw new Error('Only admins can add members');
    }
    return this.groupService.addMembersByEmail(groupId, dto.emails);
  }

  @Delete(':groupId/members/:userId')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Remove a member (admin or self-removal)' })
  async removeMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
    @CurrentUser('id') requestUserId: string,
    @Req() req: any,
  ) {
    return this.groupService.removeMember(
      groupId,
      userId,
      requestUserId,
      req.groupRole,
    );
  }

  @Get(':groupId/members/search')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Search registered users to invite' })
  async searchUsers(
    @Param('groupId') groupId: string,
    @Query('q') query: string,
  ) {
    return this.groupService.searchUsersToInvite(groupId, query);
  }
}
