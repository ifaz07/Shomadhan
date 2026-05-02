import { ShieldCheck } from "lucide-react";

const VERIFIED_BADGE_STYLES =
  "inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700";

export const VerifiedBadge = ({
  label = "Verified",
  className = "",
  icon = false,
}) => (
  <span
    className={`${VERIFIED_BADGE_STYLES}${className ? ` ${className}` : ""}`}
  >
    {icon && <ShieldCheck size={11} className="mr-1.5" />}
    {label}
  </span>
);

export const VerifiedMark = ({ className = "", iconSize = 9 }) => (
  <div
    className={`flex h-4 w-4 items-center justify-center rounded-full border border-white bg-emerald-500 text-white shadow-sm${
      className ? ` ${className}` : ""
    }`}
  >
    <ShieldCheck size={iconSize} />
  </div>
);

export default VerifiedBadge;
