import { ApiPropertyOptional } from '@nestjs/swagger';
import { AdminAction, ContentEntityType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListAdminLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AdminAction })
  @IsOptional()
  @IsEnum(AdminAction)
  action?: AdminAction;

  @ApiPropertyOptional({ enum: ContentEntityType })
  @IsOptional()
  @IsEnum(ContentEntityType)
  entityType?: ContentEntityType;
}
