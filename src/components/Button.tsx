import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './icons.js';

/**
 * Fiori Button (sap.m.Button best practice, hand-built on Horizon tokens).
 * - Exactly ONE `emphasized` action per view/footer/dialog — the single
 *   primary action. Everything else is `default`, `transparent` or
 *   semantic (`negative` for destructive, `positive` for accept).
 * - Every button carries an SAP-icon-style glyph (`icon`) plus text.
 *   Icon-only buttons must provide `ariaLabel`.
 * - Renders a router Link when `to` is set, otherwise a native button.
 */

export type FioriButtonDesign = 'emphasized' | 'default' | 'transparent' | 'negative' | 'positive';

const DESIGN_CLASS: Record<FioriButtonDesign, string> = {
  emphasized: 'btn-primary',
  default: '',
  transparent: 'btn-transparent',
  negative: 'btn-negative',
  positive: 'btn-positive',
};

interface FioriButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  design?: FioriButtonDesign;
  /** SAP-icon-style glyph shown before the label (required by Fiori guidance). */
  icon?: IconName;
  /** Router destination — renders a Link instead of a button. */
  to?: string;
  small?: boolean;
  ariaLabel?: string;
  children?: ReactNode;
}

export function FioriButton({
  design = 'default',
  icon,
  to,
  small = false,
  ariaLabel,
  children,
  className,
  type,
  ...rest
}: FioriButtonProps): React.JSX.Element {
  const cls = ['btn', DESIGN_CLASS[design], small ? 'btn-small' : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {icon && (
        <span className="btn-icon" aria-hidden="true">
          <Icon name={icon} size={small ? 14 : 16} />
        </span>
      )}
      {children && <span>{children}</span>}
    </>
  );
  if (to !== undefined) {
    return (
      <Link className={`${cls} btn-link`} to={to} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }
  return (
    <button className={cls} type={type ?? 'button'} aria-label={ariaLabel} {...rest}>
      {content}
    </button>
  );
}
