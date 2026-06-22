import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, cert, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FirestoreService implements OnModuleInit {
  private dbInstance: Firestore;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID') || 'lucky-processor-500115-v0';
    const serviceAccountKey = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_KEY');

    if (getApps().length === 0) {
      let credential: any = undefined;

      if (serviceAccountKey) {
        try {
          let parsedKey: any;
          if (serviceAccountKey.trim().startsWith('{')) {
            parsedKey = JSON.parse(serviceAccountKey);
          } else {
            const resolvedPath = path.resolve(process.cwd(), serviceAccountKey);
            const fileContent = fs.readFileSync(resolvedPath, 'utf8');
            parsedKey = JSON.parse(fileContent);
          }
          credential = cert(parsedKey);
        } catch (err) {
          console.warn('Failed to load service account key, falling back to application default credentials:', err);
        }
      }

      // If no credential loaded and we are not in emulator mode, try application default
      if (!credential && !process.env.FIRESTORE_EMULATOR_HOST) {
        try {
          credential = applicationDefault();
        } catch (err) {
          console.warn('Application default credentials not found, continuing without explicit credentials (useful for emulator).');
        }
      }

      initializeApp({
        ...(credential ? { credential } : {}),
        projectId,
      });
    }

    this.dbInstance = getFirestore();
    
    // Enable settings for timestamp compatibility if needed
    this.dbInstance.settings({ ignoreUndefinedProperties: true });
  }

  get db(): Firestore {
    return this.dbInstance;
  }

  collection(name: string) {
    return this.dbInstance.collection(name);
  }
}
