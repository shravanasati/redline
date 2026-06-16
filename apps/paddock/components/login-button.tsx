"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient, signIn } from "@/lib/auth-client";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      className="h-5 w-5 mr-2"
      role="img"
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <title>GitHub</title>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.084-.729.084-.729 1.205.084 1.84 1.236 1.84 1.236 1.07 1.835 2.805 1.304 3.49.997.107-.776.417-1.305.76-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.469-2.38 1.236-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.405 1.02.006 2.046.139 3.003.405 2.291-1.552 3.299-1.23 3.299-1.23.653 1.653.242 2.873.118 3.176.77.84 1.236 1.91 1.236 3.22 0 4.61-2.807 5.624-5.479 5.92.43.372.81 1.102.81 2.222 0 1.606-.015 2.903-.015 3.293 0 .318.22.69.825.573C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function LoginButton() {
  const lastMethod = authClient.getLastUsedLoginMethod();
  console.log(lastMethod)
  return (
    <Button size="lg" className="w-full" onClick={() => signIn("github")}>
      <GithubIcon className="size-5" />
      Login with GitHub
      {lastMethod === "github" && (
        <Badge variant="secondary" className="ml-2">
          Last used
        </Badge>
      )}
    </Button>
  );
}
