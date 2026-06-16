import { LoginWithNextURL } from "@/components/login-next-url";

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-8xl mb-4">
          🙅
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">403</h1>
        <p className="text-xl text-muted-foreground mb-4">
          Unauthorized! You&apos;re not allowed to access this page.
        </p>
        <LoginWithNextURL loginURL="/login">
          <span>Login to continue</span>
        </LoginWithNextURL>
      </div>
    </div>
  );
};

export default Unauthorized;
