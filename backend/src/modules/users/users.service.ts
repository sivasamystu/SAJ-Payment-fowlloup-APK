import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF';

@Injectable()
export class UsersService {
  constructor(private firestoreService: FirestoreService) {}

  async findAllByCompany(companyId: string) {
    const snap = await this.firestoreService.collection('users')
      .where('companyId', '==', companyId)
      .get();
    
    const users = snap.docs.map(doc => doc.data() as any);
    // Sort by name case-insensitively
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(id: string) {
    const userDoc = await this.firestoreService.collection('users').doc(id).get();
    if (!userDoc.exists) {
      throw new NotFoundException('User not found');
    }
    const userData = userDoc.data() as any;
    
    let company: any = null;
    if (userData.companyId) {
      const companySnap = await this.firestoreService.collection('companies').doc(userData.companyId).get();
      if (companySnap.exists) {
        company = companySnap.data() as any;
      }
    }
    
    return {
      ...userData,
      company,
    };
  }

  async create(data: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string;
    mobileNumber?: string;
  }) {
    const userDoc = await this.firestoreService.collection('users').doc(data.id).get();
    if (userDoc.exists) {
      throw new BadRequestException('User with this UID already exists');
    }

    const userData = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      companyId: data.companyId,
      mobileNumber: data.mobileNumber || null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.firestoreService.collection('users').doc(data.id).set(userData);
    return userData;
  }

  async update(
    id: string,
    companyId: string,
    data: { name?: string; role?: UserRole; mobileNumber?: string; isActive?: boolean },
  ) {
    const user = await this.findOne(id);
    if (user.companyId !== companyId) {
      throw new BadRequestException('Unauthorized user update request');
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.mobileNumber !== undefined) updateData.mobileNumber = data.mobileNumber;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const ref = this.firestoreService.collection('users').doc(id);
    await ref.update(updateData);
    
    const updated = await ref.get();
    return updated.data() as any;
  }

  async remove(id: string, companyId: string) {
    const user = await this.findOne(id);
    if (user.companyId !== companyId) {
      throw new BadRequestException('Unauthorized user deletion request');
    }
    await this.firestoreService.collection('users').doc(id).delete();
    return { id, deleted: true };
  }
}
