import path from 'node:path';
import dotenv from 'dotenv';

// Loaded via `import './env'` as the FIRST import of index.ts. ES module imports
// are evaluated before the importing module's body, so calling dotenv.config()
// inside index.ts ran too late: modules that read process.env at load time
// (admin/seller token secrets, Razorpay, Cloudinary) saw empty values locally.
dotenv.config({ quiet: true } as any);
dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true } as any);
dotenv.config({ path: path.resolve(import.meta.dirname, '../../../.env'), quiet: true } as any);
