import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationRepository: jest.Mocked<NotificationRepository>;

  beforeEach(() => {
    notificationRepository = {
      listForParent: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<NotificationRepository>;

    service = new NotificationsService(notificationRepository);
  });

  it('returns notifications for the authenticated parent', async () => {
    notificationRepository.listForParent.mockResolvedValue({
      items: [{ id: 'notification-1' }],
      meta: {
        total: 1,
        page: 1,
        page_size: 10,
        total_pages: 1,
      },
    } as never);

    const result = await service.listNotifications(
      {
        sub: 'parent-1',
        role: 'PARENT',
        accountType: 'USER',
        tokenType: 'access',
      },
      {},
    );

    expect(notificationRepository.listForParent).toHaveBeenCalledWith(
      'parent-1',
      {},
    );
    expect(result.items).toHaveLength(1);
  });

  it('marks a notification as read for the owning parent', async () => {
    notificationRepository.findById.mockResolvedValue({
      id: 'notification-1',
      parentId: 'parent-1',
    } as never);
    notificationRepository.update.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
      readAt: new Date(),
    } as never);

    const result = await service.updateNotification(
      {
        sub: 'parent-1',
        role: 'PARENT',
        accountType: 'USER',
        tokenType: 'access',
      },
      'notification-1',
      {
        isRead: true,
      },
    );

    expect(notificationRepository.update).toHaveBeenCalledWith(
      'notification-1',
      expect.objectContaining({
        isRead: true,
        readAt: expect.any(Date),
      }),
    );
    expect(result.isRead).toBe(true);
  });

  it('rejects notification access from another parent', async () => {
    notificationRepository.findById.mockResolvedValue({
      id: 'notification-1',
      parentId: 'another-parent',
    } as never);

    await expect(
      service.updateNotification(
        {
          sub: 'parent-1',
          role: 'PARENT',
          accountType: 'USER',
          tokenType: 'access',
        },
        'notification-1',
        {
          isRead: true,
        },
      ),
    ).rejects.toThrow(
      new ForbiddenException('You do not have access to this notification'),
    );
  });

  it('throws when a notification is missing', async () => {
    notificationRepository.findById.mockResolvedValue(null);

    await expect(
      service.updateNotification(
        {
          sub: 'parent-1',
          role: 'PARENT',
          accountType: 'USER',
          tokenType: 'access',
        },
        'missing-notification',
        {
          isRead: true,
        },
      ),
    ).rejects.toThrow(new NotFoundException('Notification not found'));
  });
});
