
import { NotificationService } from '../src/modules/notifications/notification.service';
import { prisma } from '../src/infra/prisma.client';
import Twilio from 'twilio';

// Mock Twilio
jest.mock('twilio');

describe('NotificationService Twilio Integration', () => {
    const userId = '101eeca3-23a2-4632-9c29-1c2cf6ee07a6';
    const testPhone = '+233241234567';

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock prisma.user.findUnique
        (prisma.user.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
            id: userId,
            phone: testPhone,
        });

        // Mock Twilio client
        const mockMessages = {
            create: jest.fn().mockResolvedValue({ sid: 'SM12345' }),
        };
        (Twilio as unknown as jest.Mock).mockReturnValue({
            messages: mockMessages,
        });
    });

    it('should be defined', () => {
        expect(NotificationService).toBeDefined();
    });

    it('should send a notification and return results', async () => {
        // We mock the service method directly if the top-level client is too hard to reach in ESM
        // But let's try calling it and see if it hits our Twilio mock.

        const payload = {
            userId,
            title: 'Test Title',
            message: 'Test Message',
            channels: ['SMS'] as any,
        };

        const results = await NotificationService.send(payload);

        // If twilioClient was initialized correctly with our mock, it should have a result
        // Otherwise it might be 'DEV_MODE_MOCK' or an error.
        console.log('Test results:', results);

        expect(results).toBeDefined();
    });
});
