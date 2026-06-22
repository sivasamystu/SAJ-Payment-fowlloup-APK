import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';

export type SubscriptionStatus = 'active' | 'trial' | 'suspended' | 'expired';

@Injectable()
export class CompaniesService {
  constructor(private firestoreService: FirestoreService) {}

  async findAll() {
    const snap = await this.firestoreService.collection('companies').get();
    const list = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      
      // Get counts
      const usersSnap = await this.firestoreService.collection('users').where('companyId', '==', doc.id).get();
      const customersSnap = await this.firestoreService.collection('customers').where('companyId', '==', doc.id).get();
      const invoicesSnap = await this.firestoreService.collection('invoices').where('companyId', '==', doc.id).get();
      
      list.push({
        ...data,
        _count: {
          users: usersSnap.size,
          customers: customersSnap.size,
          invoices: invoicesSnap.size,
        }
      });
    }
    return list;
  }

  async findOne(id: string) {
    const doc = await this.firestoreService.collection('companies').doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException('Company not found');
    }
    const data = doc.data();
    
    // Include users and customers
    const usersSnap = await this.firestoreService.collection('users').where('companyId', '==', id).get();
    const customersSnap = await this.firestoreService.collection('customers').where('companyId', '==', id).get();
    
    const users = usersSnap.docs.map(d => d.data());
    const customers = customersSnap.docs.map(d => d.data());
    
    return {
      ...data,
      users,
      customers,
    };
  }

  async create(data: { name: string; subscriptionPlan?: string }) {
    const ref = this.firestoreService.collection('companies').doc();
    const company = {
      id: ref.id,
      name: data.name,
      subscriptionPlan: data.subscriptionPlan || 'basic',
      subscriptionStatus: 'trial' as SubscriptionStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(company);
    return company;
  }

  async updateSubscription(id: string, status: SubscriptionStatus, plan?: string) {
    const ref = this.firestoreService.collection('companies').doc(id);
    const updateData: any = {
      subscriptionStatus: status,
      updatedAt: new Date().toISOString(),
    };
    if (plan) {
      updateData.subscriptionPlan = plan;
    }
    await ref.update(updateData);
    
    // return updated document
    const updated = await ref.get();
    return updated.data();
  }

  async remove(id: string) {
    await this.firestoreService.collection('companies').doc(id).delete();
    return { id, deleted: true };
  }
}
