"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
	type CreateMonitorInput,
	createMonitor,
	deleteMonitor,
	getMonitorById,
	getMonitorsByUserId,
	updateMonitor,
	pauseMonitor,
} from "@/lib/db/crud/monitors";
import { monitorStatusEnum, monitorTypeEnum } from "@/lib/db/schema/monitors";

const monitorTypeValues = monitorTypeEnum.enumValues;
const monitorStatusValues = monitorStatusEnum.enumValues;

const createMonitorSchema = z.object({
	name: z.string().min(1).max(255),
	type: z.enum(monitorTypeValues),
	endpoint: z.url(),
	frequency: z.union([
		z.literal(30),
		z.literal(60),
		z.literal(120),
		z.literal(180),
		z.literal(300),
		z.literal(600),
		z.literal(900),
		z.literal(1800),
		z.literal(3600),
	]),
	timeout: z.number().int().min(1).max(60).optional(),
	assertions: z
		.array(
			z.object({
				target: z.enum(["status_code", "body", "response_time"]),
				operator: z.enum(["equals", "contains", "less_than"]),
				value: z.union([z.string(), z.number()]),
			}),
		)
		.optional(),
	metadata: z
		.object({
			headers: z.record(z.string(), z.string()).optional(),
			method: z.enum(["GET", "POST", "HEAD"]).optional(),
			body: z.string().optional(),
		})
		.optional(),
});

const updateMonitorSchema = createMonitorSchema.partial();

export async function createMonitorAction(
	_prevState: unknown,
	formData: FormData,
) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const raw = Object.fromEntries(formData);

		let assertionsJson: unknown = undefined;
		if (raw.assertions) {
			try {
				assertionsJson = JSON.parse(raw.assertions as string);
			} catch {}
		}

		let metadataJson: unknown = undefined;
		if (raw.metadata) {
			try {
				metadataJson = JSON.parse(raw.metadata as string);
			} catch {}
		}

		const parsed = createMonitorSchema.safeParse({
			...raw,
			frequency: raw.frequency ? Number(raw.frequency) : undefined,
			timeout: raw.timeout ? Number(raw.timeout) : undefined,
			assertions: assertionsJson,
			metadata: metadataJson,
		});

		if (!parsed.success) {
			return { success: false, error: parsed.error.flatten().fieldErrors };
		}

		const input: CreateMonitorInput = {
			userId: session.user.id,
			status: "active",
			...parsed.data,
		};

		const monitor = await createMonitor(input);

		revalidatePath("/dashboard/monitors");

		return { success: true, data: monitor };
	} catch (e) {
		console.error("createMonitorAction failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

export async function updateMonitorAction(
	monitorId: string,
	_prevState: unknown,
	formData: FormData,
) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const existing = await getMonitorById(monitorId);
		if (!existing) {
			return { success: false, error: "Monitor not found" };
		}
		if (existing.userId !== session.user.id) {
			return { success: false, error: "Forbidden" };
		}

		const raw = Object.fromEntries(formData);

		let assertionsJson: unknown = undefined;
		if (raw.assertions) {
			try {
				assertionsJson = JSON.parse(raw.assertions as string);
			} catch {}
		}

		let metadataJson: unknown = undefined;
		if (raw.metadata) {
			try {
				metadataJson = JSON.parse(raw.metadata as string);
			} catch {}
		}

		const parsed = updateMonitorSchema.safeParse({
			...raw,
			frequency: raw.frequency ? Number(raw.frequency) : undefined,
			timeout: raw.timeout ? Number(raw.timeout) : undefined,
			assertions: assertionsJson,
			metadata: metadataJson,
		});

		if (!parsed.success) {
			return { success: false, error: parsed.error.flatten().fieldErrors };
		}

		const monitor = await updateMonitor(monitorId, parsed.data);

		revalidatePath("/dashboard/monitors");

		return { success: true, data: monitor };
	} catch (e) {
		console.error("updateMonitorAction failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

export async function deleteMonitorAction(monitorId: string) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const existing = await getMonitorById(monitorId);
		if (!existing) {
			return { success: false, error: "Monitor not found" };
		}
		if (existing.userId !== session.user.id) {
			return { success: false, error: "Forbidden" };
		}

		const monitor = await deleteMonitor(monitorId);

		revalidatePath("/dashboard/monitors");

		return { success: true, data: monitor };
	} catch (e) {
		console.error("deleteMonitorAction failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

export async function fetchMonitorByID(monitorId: string) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const monitor = await getMonitorById(monitorId);
		if (!monitor) {
			return { success: false, error: "Monitor not found" };
		}
		if (monitor.userId !== session.user.id) {
			return { success: false, error: "Forbidden" };
		}

		return { success: true, data: monitor };
	} catch (e) {
		console.error("fetchMonitorByID failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

export async function fetchMonitorsByUser(userId: string) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const monitors = await getMonitorsByUserId(userId);
		if (!monitors) {
			return { success: false, error: "Monitors not found" };
		}

		return { success: true, data: monitors };
	} catch (e) {
		console.error("fetchMonitorsByUser failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

export async function toggleMonitorPauseAction(monitorId: string) {
	try {
		const session = await getSession({ headers: await headers() });
		if (!session?.user?.id) {
			return { success: false, error: "Not authenticated" };
		}

		const existing = await getMonitorById(monitorId);
		if (!existing) {
			return { success: false, error: "Monitor not found" };
		}
		if (existing.userId !== session.user.id) {
			return { success: false, error: "Forbidden" };
		}

		const shouldPause = existing.status === "active";
		const monitor = await pauseMonitor(monitorId, shouldPause);

		revalidatePath("/dashboard/monitors");

		return { success: true, data: monitor };
	} catch (e) {
		console.error("toggleMonitorPauseAction failed:", e);
		return { success: false, error: (e as Error).message };
	}
}

