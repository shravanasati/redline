import { Activity } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Changelog", "Documentation"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border/40 px-4 pb-8 pt-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
            >
              <Activity className="size-5 text-primary" />
              redline
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Distributed uptime monitoring built for teams that ship fast and
              sleep well.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="mb-3 text-sm font-semibold">{group.title}</h4>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link}>
                    <span className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-border/40 pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} redline. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
