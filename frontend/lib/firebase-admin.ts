import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            // 환경 변수에 JSON 문자열로 저장된 키가 있는 경우
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log('Firebase admin initialized via environment variable');
        } else {
            // 기존 방식 (로컬 개발 환경 등)
            admin.initializeApp();
            console.log('Firebase admin initialized via default credentials');
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
