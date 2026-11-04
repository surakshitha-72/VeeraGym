import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

let serviceAccount: any;

if (serviceAccountEnv) {
  serviceAccount = JSON.parse(serviceAccountEnv);
} else {
  const serviceAccountPath = path.resolve(
    process.cwd(),
    'secrets',
    'firebase-service-account.json'
  );

  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(
      'Firebase credentials not found. Configure FIREBASE_SERVICE_ACCOUNT_JSON.'
    );
  }

  serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8')
  );
}

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount),
    });

export const firebaseMessaging = getMessaging(firebaseApp);
