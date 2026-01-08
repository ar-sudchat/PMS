
const { getProjectFilterOptions } = require('./lib/actions/project-actions');

async function test() {
    try {
        console.log('Fetching filter options...');
        const options = await getProjectFilterOptions();
        console.log('Customers count:', options.customers.length);
        console.log('Managers count:', options.managers.length);
        console.log('Owners count:', options.owners.length);

        if (options.customers.length > 0) console.log('Sample Customer:', options.customers[0]);
        if (options.managers.length > 0) console.log('Sample Manager:', options.managers[0]);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Mock connection if needed, but project-actions imports getConnection.
// Next.js server actions might not run easily in standalone node script if they rely on specific setup.
// Let's rely on the app logs first if possible, or try to run this if straightforward.
// Wait, project-actions uses 'mssql' and local connection config. It might work if env vars are loaded.
