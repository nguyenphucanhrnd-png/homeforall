import type { PetLook, Species } from "@/lib/pets/types";
import { cn } from "@/lib/utils";

// Placeholder art for demo pets (prompt §13: illustrations, never photos).
// Flat shapes in the logo's style; real listings use partner photos instead.

const BACKDROPS = [
  { bg: "#DCEBFA", blob: "#3690D5" },
  { bg: "#FFE6CF", blob: "#FFC18D" },
  { bg: "#FFF6EE", blob: "#03508A" },
] as const;

function isDark(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 90;
}

type Props = {
  species: Species;
  look: PetLook;
  /** 0–2: picks backdrop and props, so a gallery shows varied frames. */
  variant?: number;
  title?: string;
  className?: string;
};

export function PetIllustration({ species, look, variant = 0, title, className }: Props) {
  const backdrop = BACKDROPS[variant % BACKDROPS.length];
  const dark = isDark(look.coat);
  const line = dark ? "#F5F0EA" : "#0F2A44";
  const muzzle = look.pattern === "tuxedo" ? look.accent : dark ? "#4A4A52" : "#FFFFFF";

  return (
    <svg
      viewBox="0 0 400 300"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("block h-auto w-full", className)}
    >
      <rect width="400" height="300" fill={backdrop.bg} />
      <circle cx={variant === 1 ? 300 : 90} cy={variant === 2 ? 240 : 70} r="120" fill={backdrop.blob} opacity="0.18" />
      <Decor variant={variant} />

      <g transform={variant === 2 ? "translate(20 10) rotate(-6 200 160)" : undefined}>
        {/* body peeking below the head */}
        <ellipse cx="200" cy="290" rx="110" ry="70" fill={look.coat} />
        {species === "cat" ? (
          <CatHead look={look} line={line} muzzle={muzzle} dark={dark} />
        ) : (
          <DogHead look={look} line={line} muzzle={muzzle} dark={dark} />
        )}
      </g>
    </svg>
  );
}

type HeadProps = { look: PetLook; line: string; muzzle: string; dark: boolean };

function Eyes({ dark, y = 150 }: { dark: boolean; y?: number }) {
  return (
    <g>
      {[168, 232].map((x) => (
        <g key={x}>
          {dark && <ellipse cx={x} cy={y} rx="12" ry="14" fill="#E8B04A" />}
          <ellipse cx={x} cy={y} rx={dark ? 6 : 9} ry={dark ? 11 : 12} fill="#0F2A44" />
          <circle cx={x + 3} cy={y - 5} r="3" fill="#FFFFFF" />
        </g>
      ))}
    </g>
  );
}

function CatHead({ look, line, muzzle, dark }: HeadProps) {
  return (
    <g>
      <path d="M128 128 L146 52 L190 104 Z" fill={look.coat} />
      <path d="M272 128 L254 52 L210 104 Z" fill={look.coat} />
      <path d="M142 112 L150 72 L174 102 Z" fill="#FFC18D" />
      <path d="M258 112 L250 72 L226 102 Z" fill="#FFC18D" />
      <ellipse cx="200" cy="160" rx="86" ry="72" fill={look.coat} />
      {look.pattern === "tabby" && (
        <g stroke={look.accent} strokeWidth="7" strokeLinecap="round" fill="none">
          <path d="M200 96 v22" />
          <path d="M180 100 l6 18" />
          <path d="M220 100 l-6 18" />
          <path d="M120 160 h18" />
          <path d="M262 160 h18" />
        </g>
      )}
      {look.pattern === "patch" && <ellipse cx="232" cy="140" rx="34" ry="30" fill={look.accent} />}
      {(look.pattern === "tuxedo" || !dark) && <ellipse cx="200" cy="192" rx="42" ry="30" fill={muzzle} />}
      <Eyes dark={dark} />
      <path d="M192 178 h16 l-8 9 Z" fill="#E58A8A" />
      <path d="M200 187 q-7 10 -16 5 M200 187 q7 10 16 5" stroke={line} strokeWidth="3" fill="none" strokeLinecap="round" />
      <g stroke={line} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M150 186 l-40 -6 M150 194 l-40 4" />
        <path d="M250 186 l40 -6 M250 194 l40 4" />
      </g>
    </g>
  );
}

function DogHead({ look, line, muzzle, dark }: HeadProps) {
  const floppy = look.ears !== "pointy";
  return (
    <g>
      {floppy ? (
        <>
          <ellipse cx="124" cy="150" rx="26" ry="56" fill={look.accent} transform="rotate(18 124 150)" />
          <ellipse cx="276" cy="150" rx="26" ry="56" fill={look.accent} transform="rotate(-18 276 150)" />
        </>
      ) : (
        <>
          <path d="M126 120 L140 50 L184 100 Z" fill={look.accent} />
          <path d="M274 120 L260 50 L216 100 Z" fill={look.accent} />
        </>
      )}
      <ellipse cx="200" cy="158" rx="80" ry="76" fill={look.coat} />
      {look.pattern === "patch" && <ellipse cx="166" cy="142" rx="30" ry="28" fill={look.accent} />}
      <ellipse cx="200" cy="198" rx="44" ry="32" fill={dark ? look.accent : muzzle} />
      <Eyes dark={dark} y={146} />
      <ellipse cx="200" cy="182" rx="15" ry="10" fill="#0F2A44" />
      <path d="M200 192 v8 M200 200 q-10 10 -20 4 M200 200 q10 10 20 4" stroke={line === "#F5F0EA" ? "#0F2A44" : line} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M194 208 q6 14 12 0 Z" fill="#E58A8A" />
    </g>
  );
}

function Decor({ variant }: { variant: number }) {
  if (variant === 1) {
    // heart, echoing the logo
    return (
      <path
        d="M330 120 s-30 -18 -30 -38 a15 15 0 0 1 30 -6 a15 15 0 0 1 30 6 c0 20 -30 38 -30 38 Z"
        fill="#03508A"
        opacity="0.85"
      />
    );
  }
  if (variant === 2) {
    // paw-print trail
    return (
      <g fill="#FF993D" opacity="0.7">
        {[
          [40, 250],
          [80, 215],
          [52, 175],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx="11" ry="9" />
            <circle cx={x - 10} cy={y - 13} r="4" />
            <circle cx={x} cy={y - 17} r="4" />
            <circle cx={x + 10} cy={y - 13} r="4" />
          </g>
        ))}
      </g>
    );
  }
  return <circle cx="340" cy="250" r="22" fill="#FF993D" />; // ball
}
