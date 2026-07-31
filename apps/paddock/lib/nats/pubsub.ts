import { create, toBinary } from "@bufbuild/protobuf";
import { EventType, MonitorEventSchema } from "@/lib/pb/monitors/updates_pb";
import { getNatsConnection } from "@/lib/nats/conn";

/**
 * NATS subject hierarchy:
 *   monitors.<monitorId>
 *
 * Subscribers on `monitors.*` will receive all monitor events.
 */
const MONITOR_SUBJECT_PREFIX = "monitors.events";

const NATS_PUBLISH_TIMEOUT_MS = 10_000;

function monitorSubject(): string {
  return `${MONITOR_SUBJECT_PREFIX}`;
}

/**
 * Publish a monitor upsert event (create or update) to NATS.
 *
 * @param monitorId - The UUID of the affected monitor.
 * @param version   - The new version number of the monitor.
 */
export async function publishMonitorUpserted(
  monitorId: string,
  version: number,
): Promise<void> {
  const nc = await getNatsConnection();

  const event = create(MonitorEventSchema, {
    eventType: EventType.UPSERT,
    monitorId,
    version,
  });

  nc.publish(monitorSubject(), toBinary(MonitorEventSchema, event));
}

/**
 * Publish a monitor delete event to NATS.
 *
 * @param monitorId - The UUID of the deleted monitor.
 * @param version   - The version of the monitor at deletion time.
 */
export async function publishMonitorDeleted(
  monitorId: string,
  version: number,
): Promise<void> {
  const nc = await getNatsConnection();

  const event = create(MonitorEventSchema, {
    eventType: EventType.DELETE,
    monitorId,
    version,
  });

  nc.publish(monitorSubject(), toBinary(MonitorEventSchema, event));
}

/**
 * Runs a NATS publish with a 10 s timeout. Errors are logged but never
 * re-thrown so they cannot block or fail the parent action.
 */
export async function safePublish(publish: Promise<void>): Promise<void> {
  try {
    await Promise.race([
      publish,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("NATS publish timed out")),
          NATS_PUBLISH_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (e) {
    console.error("NATS publish error:", e);
  }
}
