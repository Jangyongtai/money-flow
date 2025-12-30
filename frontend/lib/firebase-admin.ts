import * as admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

if (!admin.apps.length) {
    try {
        if (process.env.NODE_ENV === 'development') {
            // 로컬 개발 환경일 때
            const saParentPath = path.join(process.cwd(), '..', 'service-account.json');
            const saCurrentPath = path.join(process.cwd(), 'service-account.json');
            const saAbsoluteFallback = 'd:\\node\\money\\service-account.json';
            const saAbsoluteFallbackUpper = 'D:\\node\\money\\service-account.json';

            let saPath = null;
            if (fs.existsSync(saParentPath)) saPath = saParentPath;
            else if (fs.existsSync(saCurrentPath)) saPath = saCurrentPath;
            else if (fs.existsSync(saAbsoluteFallback)) saPath = saAbsoluteFallback;
            else if (fs.existsSync(saAbsoluteFallbackUpper)) saPath = saAbsoluteFallbackUpper;

            if (saPath) {
                admin.initializeApp({
                    credential: admin.credential.cert(saPath)
                });
                console.log(`[LOCAL] 🔥 Firebase Admin Success: ${saPath}`);
            } else {
                admin.initializeApp();
                console.log('[LOCAL] ⚠️ Firebase Admin: No key file found. Falling back.');
            }
        } else {
            // 운영 환경(App Hosting)
            admin.initializeApp();
            console.log('Firebase admin initialized via default credentials');
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const db = admin.firestore();
