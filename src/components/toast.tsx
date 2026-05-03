"use client";

type Props = {
  message: string;
  show: boolean;
};

export function Toast({ message, show }: Props) {
  return (
    <div className="toast" data-show={show} role="status" aria-live="polite">
      {message}
    </div>
  );
}
