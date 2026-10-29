import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";
import clsx from "clsx";
import type { FC, MouseEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

export type ButtonVariant =
  "primary" | "secondary" | "outline" | "danger" | "danger-outline" | "ghost" | "link";

export type ButtonSize = "sm" | "md" | "lg" | "small" | "middle" | "large";

export interface ButtonProps extends Omit<AntButtonProps, "size" | "type" | "variant"> {
  to?: string;
  href?: string;
  children?: ReactNode;
  target?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: "primary" | "ghost" | "dashed" | "link" | "text" | "default";
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

const SIZE_MAP: Record<ButtonSize, AntButtonProps["size"]> = {
  sm: "small",
  md: "middle",
  lg: "large",
  small: "small",
  middle: "middle",
  large: "large",
};

export const Button: FC<ButtonProps> = ({
  to,
  href,
  children,
  disabled,
  target,
  leftIcon,
  rightIcon,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  type,
  htmlType,
  icon,
  danger,
  ghost,
  onClick,
  style,
  ...rest
}) => {
  const antdSize = SIZE_MAP[size];

  let antdType: AntButtonProps["type"] = "default";
  let isDanger = danger;

  if (type) {
    antdType = type === "ghost" ? "text" : type;
  } else {
    switch (variant) {
      case "primary":
        antdType = "primary";
        break;
      case "danger":
        antdType = "primary";
        isDanger = true;
        break;
      case "danger-outline":
        isDanger = true;
        break;
      case "ghost":
        antdType = "text";
        break;
      case "link":
        antdType = "link";
        break;
      default:
        antdType = "default";
    }
  }

  const primaryClass =
    antdType === "primary" && !isDanger
      ? "!bg-brand hover:!bg-brand-hover !border-brand text-white shadow-sm"
      : "";

  const heightClass = clsx("!h-10 !min-h-10", !children && icon ? "!w-10 !px-0" : "");

  const buttonElement = (
    <AntButton
      type={antdType}
      size={antdSize}
      htmlType={htmlType}
      danger={isDanger}
      ghost={ghost}
      loading={loading}
      disabled={disabled}
      icon={icon ?? leftIcon}
      onClick={onClick}
      className={clsx(heightClass, primaryClass, className)}
      style={style}
      {...rest}
    >
      {children}
      {rightIcon ? <span className="ml-1 inline-flex items-center">{rightIcon}</span> : null}
    </AntButton>
  );

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className="inline-block no-underline">
        {buttonElement}
      </Link>
    );
  }

  if (href && !disabled && !loading) {
    return (
      <a href={href} target={target} rel="noreferrer" className="inline-block no-underline">
        {buttonElement}
      </a>
    );
  }

  return buttonElement;
};
