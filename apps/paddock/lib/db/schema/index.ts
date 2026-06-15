import * as authSchema from "./auth-schema";
import * as monitorsSchema from "./monitors";

export * from "./auth-schema";
export * from "./monitors";

export const schema = {
  ...authSchema,
  ...monitorsSchema,
};
