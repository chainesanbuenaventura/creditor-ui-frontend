export default function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 120"
      className={className}
      fill="#A78BFA"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stylized lowercase "j" in light purple - blocky sans-serif style */}
      {/* Dot (perfect circle) */}
      <circle cx="50" cy="25" r="12" />
      {/* Main body (blocky) */}
      <rect x="38" y="35" width="24" height="60" rx="4" />
      {/* Curved tail */}
      <rect x="20" y="85" width="20" height="24" rx="4" />
    </svg>
  );
}

