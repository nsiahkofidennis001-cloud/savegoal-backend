import { prisma } from '../../infra/prisma.client.js';
import { ApiException } from '../../shared/exceptions/api.exception.js';

export class UsersService {
    static async getCurrentUser(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                merchantProfile: true,
            },
        });

        if (!user) {
            throw new ApiException(404, 'NOT_FOUND', 'User not found');
        }

        return user;
    }
}
