interface FABProps {
  onClick: () => void
  isDesktop: boolean
}

export function FAB({ onClick, isDesktop }: FABProps) {
  return (
    <button
      onClick={onClick}
      className={`
        fixed z-50
        w-14 h-14 rounded-full
        bg-primary text-on-primary
        shadow-xl
        flex items-center justify-center
        active:scale-95 transition-transform
        ${isDesktop
          ? 'top-6 right-6'
          : 'bottom-20 left-1/2 -translate-x-1/2 translate-y-1/2'
        }
      `}
      aria-label="Agregar transacción"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-7 h-7"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  )
}
