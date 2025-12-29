import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Note: You must set GOOGLE_APPLICATION_CREDENTIALS or have gcloud auth application-default login
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function migrate() {
    const jsonPath = path.join(process.cwd(), 'data', 'state.json');
    if (!fs.existsSync(jsonPath)) {
        console.log('No state.json found at', jsonPath);
        return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log('Starting migration...');

    // 1. Profiles
    if (data.profiles) {
        for (const profile of data.profiles) {
            await db.collection('profiles').doc(profile.id).set(profile, { merge: true });
            console.log(`Migrated profile: ${profile.name}`);
        }
    }

    // 2. Assets
    if (data.assets) {
        for (const asset of data.assets) {
            const profileId = asset.profileId || 'default-profile';
            await db.collection('profiles').doc(profileId).collection('assets').doc(asset.id).set({ ...asset, profileId }, { merge: true });
        }
        console.log(`Migrated ${data.assets.length} assets`);
    }

    // 3. Debts
    if (data.debts) {
        for (const debt of data.debts) {
            const profileId = debt.profileId || 'default-profile';
            await db.collection('profiles').doc(profileId).collection('debts').doc(debt.id).set({ ...debt, profileId }, { merge: true });
        }
        console.log(`Migrated ${data.debts.length} debts`);
    }

    // 4. Expenses
    if (data.expenses) {
        for (const expense of data.expenses) {
            const profileId = expense.profileId || 'default-profile';
            await db.collection('profiles').doc(profileId).collection('expenses').doc(expense.id).set({ ...expense, profileId }, { merge: true });
        }
        console.log(`Migrated ${data.expenses.length} expenses`);
    }

    // 5. Incomes
    if (data.incomes) {
        for (const income of data.incomes) {
            const profileId = income.profileId || 'default-profile';
            await db.collection('profiles').doc(profileId).collection('incomes').doc(income.id).set({ ...income, profileId }, { merge: true });
        }
        console.log(`Migrated ${data.incomes.length} incomes`);
    }

    // 6. Transactions
    if (data.transactions) {
        console.log(`Migrating ${data.transactions.length} transactions...`);
        const batchSize = 500;
        for (let i = 0; i < data.transactions.length; i += batchSize) {
            const batch = db.batch();
            const chunk = data.transactions.slice(i, i + batchSize);
            for (const txn of chunk) {
                const profileId = txn.profileId || 'default-profile';
                const ref = db.collection('profiles').doc(profileId).collection('transactions').doc(txn.id);
                batch.set(ref, { ...txn, profileId }, { merge: true });
            }
            await batch.commit();
            console.log(`Batched ${i + chunk.length} transactions`);
        }
    }

    // 7. Categories
    if (data.categories) {
        for (const cat of data.categories) {
            const profileId = cat.profileId || 'default-profile';
            await db.collection('profiles').doc(profileId).collection('categories').doc(cat.id).set({ ...cat, profileId }, { merge: true });
        }
        console.log(`Migrated ${data.categories.length} categories`);
    }

    // 8. Mappings
    if (data.transactionNameMappings) {
        await db.collection('settings').doc('transactionNameMappings').set(data.transactionNameMappings, { merge: true });
    }
    if (data.merchantCategoryMappings) {
        await db.collection('settings').doc('merchantCategoryMappings').set(data.merchantCategoryMappings, { merge: true });
    }
    if (data.keywordCategoryMappings) {
        await db.collection('settings').doc('keywordCategoryMappings').set(data.keywordCategoryMappings, { merge: true });
    }

    console.log('Migration finished successfully!');
}

migrate().catch(console.error);
