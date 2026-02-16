import { getProjects } from '@/lib/actions/project-actions';

export default async function DebugPage() {
    const result = await getProjects({});

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Debug Projects</h1>
            <pre className="bg-slate-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(result, null, 2)}
            </pre>
        </div>
    );
}
