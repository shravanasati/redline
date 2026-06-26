import { connect } from "@nats-io/transport-node";
import type { NatsConnection } from "@nats-io/nats-core";
import { env } from "@/lib/env";

let _nc: NatsConnection | null = null;

/**
 * Returns a singleton NATS connection. Creates one on first call.
 * Credentials are read from NATS_URL, NATS_USER_CONTROL_PLANE, and
 * NATS_PASS_CONTROL_PLANE environment variables.
 */
export async function getNatsConnection(): Promise<NatsConnection> {
  if (_nc !== null) {
    return _nc;
  }

  const nc = await connect({
    servers: env.NATS_URL,
    user: env.NATS_USER_CONTROL_PLANE,
    pass: env.NATS_PASS_CONTROL_PLANE,
  });

  _nc = nc;

  // Null-out the reference when the server closes the connection
  // so the next call reconnects automatically.
  nc.closed().then(() => {
    _nc = null;
  });

  return nc;
}

/**
 * Gracefully drains and closes the NATS connection (if open).
 * Call this during application shutdown.
 */
export async function closeNatsConnection(): Promise<void> {
  if (_nc !== null) {
    await _nc.drain();
    _nc = null;
  }
}
