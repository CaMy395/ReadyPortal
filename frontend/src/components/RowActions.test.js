import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RowActions from './RowActions';

test('portals actions outside a clipped table and preserves callbacks and disabled actions', async () => {
  const edit = jest.fn();
  const remove = jest.fn();
  render(
    <div data-testid="clipped-table" style={{ overflow: 'hidden' }}>
      <RowActions label="Actions for Jaleesa">
        <div><button onClick={edit}>Edit</button><button disabled onClick={remove}>Delete</button></div>
      </RowActions>
    </div>
  );
  const trigger = screen.getByRole('button', { name: 'Actions for Jaleesa' });
  expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  fireEvent.click(trigger);
  const menu = screen.getByRole('menu');
  expect(screen.getByTestId('clipped-table')).not.toContainElement(menu);
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
  expect(edit).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
});

test('supports keyboard navigation, escape and returning focus to the trigger', async () => {
  render(<RowActions><button>Edit</button><button>Delete</button></RowActions>);
  const trigger = screen.getByRole('button', { name: 'Row actions' });
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'ArrowDown' });
  const edit = screen.getByRole('menuitem', { name: 'Edit' });
  await waitFor(() => expect(edit).toHaveFocus());
  fireEvent.keyDown(edit, { key: 'ArrowDown' });
  expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('keeps edit controls and single actions visible and gives icon actions a text label', () => {
  const { rerender } = render(<RowActions inline><button>Save</button><button>Cancel</button></RowActions>);
  expect(screen.getByRole('button', { name: 'Save' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Row actions' })).not.toBeInTheDocument();
  rerender(<RowActions><button>Restore</button>{false}</RowActions>);
  expect(screen.getByRole('button', { name: 'Restore' })).toBeVisible();
  rerender(<RowActions><button title="Email quote"><svg /></button><button>Delete</button></RowActions>);
  fireEvent.click(screen.getByRole('button', { name: 'Row actions' }));
  expect(screen.getByRole('menuitem', { name: 'Email quote' })).toHaveTextContent('Email quote');
});
