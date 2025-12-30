import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        // App Hosting의 IAM 권한을 사용하여 자동으로 인증합니다.
        admin.initializeApp();
        console.log('Firebase admin initialized via default credentials');
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
