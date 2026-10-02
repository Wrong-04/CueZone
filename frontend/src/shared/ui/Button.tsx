import { Button as AntButton, type ButtonProps as AntButtonProps } from 'antd';
import clsx from 'clsx';
import type { FC, MouseEvent, ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Các biến thể giao diện của nút (primary, secondary, outline, danger, ghost, link,...).
 */
export type ButtonVariant =
  'primary' | 'secondary' | 'outline' | 'danger' | 'danger-outline' | 'ghost' | 'link';

/**
 * Kích thước nút bấm.
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'small' | 'middle' | 'large';

/**
 * Props của component Button.
 * Hỗ trợ các thuộc tính mở rộng như điều hướng `to` (React Router Link), `href` (thẻ a), `leftIcon`, `rightIcon`, `variant`.
 */
export interface ButtonProps extends Omit<AntButtonProps, 'size' | 'type' | 'variant'> {
  to?: string;
  href?: string;
  children?: ReactNode;
  target?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'primary' | 'ghost' | 'dashed' | 'link' | 'text' | 'default';
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

const SIZE_MAP: Record<ButtonSize, AntButtonProps['size']> = {
  sm: 'small',
  md: 'middle',
  lg: 'large',
  small: 'small',
  middle: 'middle',
  large: 'large',
};

/**
 * Nút bấm chuẩn của hệ thống (Button):
 * Tự động đồng bộ chiều cao chuẩn 40px với các ô nhập liệu, hỗ trợ chuyển trang (to/href), icon trái/phải và loading state.
 */
export const Button: FC<ButtonProps> = ({
  to,
  href,
  children,
  disabled,
  target,
  leftIcon,
  rightIcon,
  className,
  variant = 'primary',
  size = 'md',
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

  let antdType: AntButtonProps['type'] = 'default';
  let isDanger = danger;

  if (type) {
    antdType = type === 'ghost' ? 'text' : type;
  } else {
    switch (variant) {
      case 'primary':
        antdType = 'primary';
        break;
      case 'danger':
        antdType = 'primary';
        isDanger = true;
        break;
      case 'danger-outline':
        isDanger = true;
        break;
      case 'ghost':
        antdType = 'text';
        break;
      case 'link':
        antdType = 'link';
        break;
      default:
        antdType = 'default';
    }
  }

  const primaryClass =
    antdType === 'primary' && !isDanger
      ? '!bg-brand hover:!bg-brand-hover !border-brand text-white shadow-sm'
      : '';

  // Mọi nút cao đúng 40px như ô nhập — kể cả size 'sm'. `size` từ đây chỉ còn
  // điều khiển cỡ chữ và padding ngang, không còn đổi chiều cao.
  const heightClass = clsx('!h-10 !min-h-10', !children && icon ? '!w-10 !px-0' : '');

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
