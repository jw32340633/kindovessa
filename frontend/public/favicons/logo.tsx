import { cn } from "cn";

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "" }: LogoProps) {
  return (
    <span
      aria-label="Kindōvessa"
      className={cn(
        "inline-block whitespace-nowrap font-heading-02 uppercase leading-none tracking-[-0.055em]",
        className,
      )}
    >
      KIND<span className="text-primary">Ō</span>VESSA
    </span>
  );
}
