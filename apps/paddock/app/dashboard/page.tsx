import Unauthorized from "@/components/unauthorized";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Dashboard() {
  const session = await getSession({headers: await headers()})
  if (!session?.user.id) {
    return <Unauthorized />
  }
  return <h1 className="">Dashboard</h1>;
}
