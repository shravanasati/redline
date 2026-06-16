import Unauthorized from "@/components/unauthorized";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";

export default async function MonitorsPage() {
	const session = await getSession({ headers: await headers() })
	if (!session?.user.id) {
		return <Unauthorized />
	}

    return (
        <div>
            <h1>Monitors</h1>
        </div>
    );
}