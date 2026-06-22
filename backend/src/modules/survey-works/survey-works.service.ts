import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../../firestore/firestore.service';

export type WorkStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'BILLED' | 'PAID';

@Injectable()
export class SurveyWorksService {
  constructor(private firestoreService: FirestoreService) {}

  async findAll(companyId: string, staffId?: string) {
    let query = this.firestoreService.collection('survey-works')
      .where('companyId', '==', companyId);
    if (staffId) {
      query = query.where('assignedStaffId', '==', staffId);
    }
    const snap = await query.get();
    const works = [];
    for (const doc of snap.docs) {
      const data = doc.data() as any;
      // Fetch customer
      const custDoc = await this.firestoreService.collection('customers').doc(data.customerId).get();
      const customer = custDoc.exists ? custDoc.data() as any : null;
      
      // Fetch staff
      let assignedStaff = null;
      if (data.assignedStaffId) {
        const staffDoc = await this.firestoreService.collection('users').doc(data.assignedStaffId).get();
        assignedStaff = staffDoc.exists ? staffDoc.data() as any : null;
      }
      
      works.push({
        ...data,
        customer,
        assignedStaff,
      });
    }
    // Sort by workDate desc
    return works.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
  }

  async findOne(id: string, companyId: string) {
    const workDoc = await this.firestoreService.collection('survey-works').doc(id).get();
    if (!workDoc.exists) {
      throw new NotFoundException('Survey work not found');
    }
    const data = workDoc.data() as any;
    if (data.companyId !== companyId) {
      throw new NotFoundException('Survey work not found');
    }

    // Fetch customer
    const custDoc = await this.firestoreService.collection('customers').doc(data.customerId).get();
    const customer = custDoc.exists ? custDoc.data() as any : null;
      
    // Fetch staff
    let assignedStaff = null;
    if (data.assignedStaffId) {
      const staffDoc = await this.firestoreService.collection('users').doc(data.assignedStaffId).get();
      assignedStaff = staffDoc.exists ? staffDoc.data() as any : null;
    }

    // Fetch invoices
    const invoicesSnap = await this.firestoreService.collection('invoices')
      .where('surveyWorkId', '==', id)
      .get();
    const invoices = invoicesSnap.docs.map(d => d.data() as any);

    return {
      ...data,
      customer,
      assignedStaff,
      invoices,
    };
  }

  async create(
    companyId: string,
    data: {
      workDate: string | Date;
      workType: string;
      siteLocation: string;
      customerId: string;
      assignedStaffId?: string;
      remarks?: string;
    },
  ) {
    // Generate unique work number: SURV-YYYYMMDD-XXXX
    const dateObj = new Date(data.workDate);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateString = `${year}${month}${day}`;

    // Query count of survey works created today
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999)).toISOString();

    const todayWorksSnap = await this.firestoreService.collection('survey-works')
      .where('companyId', '==', companyId)
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const countToday = todayWorksSnap.size;
    const suffix = String(countToday + 1).padStart(4, '0');
    const workNumber = `SURV-${dateString}-${suffix}`;

    const ref = this.firestoreService.collection('survey-works').doc();
    const work = {
      id: ref.id,
      companyId,
      workNumber,
      workDate: new Date(data.workDate).toISOString(),
      workType: data.workType,
      siteLocation: data.siteLocation,
      customerId: data.customerId,
      assignedStaffId: data.assignedStaffId || null,
      remarks: data.remarks || null,
      status: 'NEW' as WorkStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(work);

    // Fetch customer and staff to include in response
    const custDoc = await this.firestoreService.collection('customers').doc(data.customerId).get();
    const customer = custDoc.exists ? custDoc.data() as any : null;
    let assignedStaff = null;
    if (data.assignedStaffId) {
      const staffDoc = await this.firestoreService.collection('users').doc(data.assignedStaffId).get();
      assignedStaff = staffDoc.exists ? staffDoc.data() as any : null;
    }

    return {
      ...work,
      customer,
      assignedStaff,
    };
  }

  async update(
    id: string,
    companyId: string,
    data: {
      workDate?: string | Date;
      workType?: string;
      siteLocation?: string;
      assignedStaffId?: string;
      status?: WorkStatus;
      remarks?: string;
    },
  ) {
    const work = await this.findOne(id, companyId);

    const updateData: any = {};
    if (data.workDate !== undefined) updateData.workDate = new Date(data.workDate).toISOString();
    if (data.workType !== undefined) updateData.workType = data.workType;
    if (data.siteLocation !== undefined) updateData.siteLocation = data.siteLocation;
    if (data.assignedStaffId !== undefined) updateData.assignedStaffId = data.assignedStaffId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    updateData.updatedAt = new Date().toISOString();

    if (data.status === 'COMPLETED' && work.status !== 'COMPLETED') {
      updateData.completionDate = new Date().toISOString();
    }

    const ref = this.firestoreService.collection('survey-works').doc(id);
    await ref.update(updateData);

    const updated = await ref.get();
    const updatedData = updated.data() as any;

    // Fetch customer and staff
    const custDoc = await this.firestoreService.collection('customers').doc(updatedData.customerId).get();
    const customer = custDoc.exists ? custDoc.data() as any : null;
    let assignedStaff = null;
    if (updatedData.assignedStaffId) {
      const staffDoc = await this.firestoreService.collection('users').doc(updatedData.assignedStaffId).get();
      assignedStaff = staffDoc.exists ? staffDoc.data() as any : null;
    }

    return {
      ...updatedData,
      customer,
      assignedStaff,
    };
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.firestoreService.collection('survey-works').doc(id).delete();
    return { id, deleted: true };
  }
}
