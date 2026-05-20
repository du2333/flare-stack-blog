import type { SVGProps } from "react";
import { type SimpleIcon, siGithub, siX } from "simple-icons";

type BrandIconProps = Omit<SVGProps<SVGSVGElement>, "height" | "width"> & {
  size?: number | string;
  strokeWidth?: number | string;
  title?: string;
};

function SimpleBrandIcon({
  icon,
  size = 24,
  strokeWidth: _strokeWidth,
  title,
  ...props
}: BrandIconProps & { icon: SimpleIcon }) {
  const hasAccessibleName =
    title || props["aria-label"] || props["aria-labelledby"];

  return (
    <svg
      {...props}
      aria-hidden={hasAccessibleName ? props["aria-hidden"] : true}
      fill="currentColor"
      height={size}
      role={hasAccessibleName ? (props.role ?? "img") : props.role}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <path d={icon.path} />
    </svg>
  );
}

export function GithubIcon(props: BrandIconProps) {
  return <SimpleBrandIcon icon={siGithub} {...props} />;
}

export function XIcon(props: BrandIconProps) {
  return <SimpleBrandIcon icon={siX} {...props} />;
}
