import React, { Children, Fragment, isValidElement, useId, useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import './RowActions.css';

// Unwrap layout-only containers while preserving conditional actions and status text.
function entries(children) {
  return Children.toArray(children).flatMap((child) => {
    if (typeof child === 'string' && !child.trim()) return [];
    if (isValidElement(child) && (child.type === Fragment || child.type === 'div')) {
      return entries(child.props.children);
    }
    return [child];
  });
}

function textContent(children) {
  return Children.toArray(children).map((child) => (
    isValidElement(child) ? textContent(child.props.children) : String(child)
  )).join(' ').trim();
}

export default function RowActions({ children, label = 'Row actions', inline = false }) {
  const [anchor, setAnchor] = useState(null);
  const id = useId();
  const items = entries(children);
  const buttons = items.filter((item) => isValidElement(item) && item.type === 'button');

  // Single actions and in-progress editing controls don't need another click.
  if (inline || buttons.length < 2) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        className="row-actions-trigger"
        id={`${id}-trigger`}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-controls={anchor ? `${id}-menu` : undefined}
        onClick={(event) => { event.stopPropagation(); setAnchor(event.currentTarget); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setAnchor(event.currentTarget);
          }
        }}
      >
        <span aria-hidden="true">{'\u2026'}</span>
      </button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        MenuListProps={{ id: `${id}-menu`, 'aria-labelledby': `${id}-trigger` }}
        PaperProps={{ className: 'row-actions-paper' }}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item, index) => {
          if (!isValidElement(item) || item.type !== 'button') {
            return <MenuItem key={index} disabled>{item}</MenuItem>;
          }
          const { onClick, children: content, style, className, type, ...props } = item.props;
          const text = textContent(content);
          const danger = /\b(delete|remove|reject|offload)\b/i.test(text);
          return (
            <MenuItem
              {...props}
              key={item.key || index}
              component="button"
              type="button"
              className={danger ? 'row-actions-danger' : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setAnchor(null);
                onClick?.(event);
              }}
            >
              {text ? content : (props['aria-label'] || props.title || content)}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
