import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ListNotificationsQueryDto } from './dto/list-notifications.query.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationRepository } from './repositories/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async listNotifications(
    currentUser: AuthUser,
    query: ListNotificationsQueryDto,
  ) {
    return this.notificationRepository.listForParent(currentUser.sub, query);
  }

  async updateNotification(
    currentUser: AuthUser,
    notificationId: string,
    updateNotificationDto: UpdateNotificationDto,
  ) {
    const notification =
      await this.notificationRepository.findById(notificationId);

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.parentId !== currentUser.sub) {
      throw new ForbiddenException(
        'You do not have access to this notification',
      );
    }

    return this.notificationRepository.update(notificationId, {
      isRead: updateNotificationDto.isRead,
      readAt: updateNotificationDto.isRead ? new Date() : null,
    });
  }
}
