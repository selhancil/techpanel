type BadgeVariant = 'bullish' | 'bearish' | 'neutral' | 'buy' | 'sell';

const variantClasses: Record<BadgeVariant, string> = {
  bullish: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  bearish: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  neutral: 'bg-slate-500/15 text-slate-400 border-slate-500/20',
  buy: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  sell: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

interface BadgeProps {
  variant: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ variant, className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function getSignalVariant(value: string): BadgeVariant {
  const v = value.toLowerCase();
  if (['buy', 'bullish', 'oversold', 'golden cross', 'above'].some(k => v.includes(k))) return 'bullish';
  if (['sell', 'bearish', 'overbought', 'death cross', 'below'].some(k => v.includes(k))) return 'bearish';
  return 'neutral';
}
