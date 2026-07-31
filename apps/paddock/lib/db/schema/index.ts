import * as authSchema from "./auth-schema";
import * as monitorsSchema from "./monitors";
import * as notificationsSchema from "./notifications";

export * from "./auth-schema";
export * from "./monitors";
export * from "./notifications";

export const schema = {
  ...authSchema,
  ...monitorsSchema,
  ...notificationsSchema,
};
