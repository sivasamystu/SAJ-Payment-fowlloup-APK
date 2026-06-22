import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';

@Injectable()
export class CustomersService {
  constructor(private firestoreService: FirestoreService) {}

  async findAll(companyId: string) {
    const snap = await this.firestoreService.collection('customers')
      .where('companyId', '==', companyId)
      .get();
    
    const customers = snap.docs.map(doc => doc.data());
    // Sort by name case-insensitively
    return customers.sort((a, b) => a.name.localeCompare(b.name));
  }

  async findOne(id: string, companyId: string) {
    const customerDoc = await this.firestoreService.collection('customers').doc(id).get();
    if (!customerDoc.exists) {
      throw new NotFoundException('Customer not found');
    }
    const customer = customerDoc.data();
    if (customer.companyId !== companyId) {
      throw new NotFoundException('Customer not found in this company');
    }
    return customer;
  }

  async create(
    companyId: string,
    data: {
      name: string;
      mobile: string;
      whatsapp: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    const ref = this.firestoreService.collection('customers').doc();
    const customer = {
      id: ref.id,
      companyId,
      name: data.name,
      mobile: data.mobile,
      whatsapp: data.whatsapp,
      email: data.email || null,
      address: data.address || null,
      gstNumber: data.gstNumber || null,
      companyName: data.companyName || null,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(customer);
    return customer;
  }

  async update(
    id: string,
    companyId: string,
    data: {
      name?: string;
      mobile?: string;
      whatsapp?: string;
      email?: string;
      address?: string;
      gstNumber?: string;
      companyName?: string;
      notes?: string;
    },
  ) {
    // Verify customer belongs to company
    await this.findOne(id, companyId);

    const ref = this.firestoreService.collection('customers').doc(id);
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.whatsapp !== undefined) updateData.whatsapp = data.whatsapp;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.gstNumber !== undefined) updateData.gstNumber = data.gstNumber;
    if (data.companyName !== undefined) updateData.companyName = data.companyName;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await ref.update(updateData);
    
    const updated = await ref.get();
    return updated.data();
  }

  async remove(id: string, companyId: string) {
    // Verify customer belongs to company
    await this.findOne(id, companyId);

    await this.firestoreService.collection('customers').doc(id).delete();
    return { id, deleted: true };
  }
}
