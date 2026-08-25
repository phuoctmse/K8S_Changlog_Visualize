// Maps the free-text `color` field in data/taxonomy.json to literal Tailwind
// classes. Classes must appear as full literal strings somewhere in source
// for Tailwind's scanner to generate them — building class names by
// concatenating the color at runtime (e.g. `bg-${color}-500`) would silently
// produce no styling, so every supported color is spelled out here.
export interface ColorClasses {
  bg: string; // solid background, e.g. for dots/badges
  bgSoft: string; // tinted background for cards
  text: string;
  border: string;
}

const PALETTE: Record<string, ColorClasses> = {
  blue: {
    bg: 'bg-blue-500',
    bgSoft: 'bg-blue-500/10 dark:bg-blue-400/10',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-500/30',
  },
  pink: {
    bg: 'bg-pink-500',
    bgSoft: 'bg-pink-500/10 dark:bg-pink-400/10',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-500/30',
  },
  teal: {
    bg: 'bg-teal-500',
    bgSoft: 'bg-teal-500/10 dark:bg-teal-400/10',
    text: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-500/30',
  },
  purple: {
    bg: 'bg-purple-500',
    bgSoft: 'bg-purple-500/10 dark:bg-purple-400/10',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-500/30',
  },
  coral: {
    bg: 'bg-orange-500',
    bgSoft: 'bg-orange-500/10 dark:bg-orange-400/10',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500/30',
  },
  amber: {
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-500/10 dark:bg-amber-400/10',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
  },
  green: {
    bg: 'bg-green-500',
    bgSoft: 'bg-green-500/10 dark:bg-green-400/10',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-500/30',
  },
};

const FALLBACK: ColorClasses = {
  bg: 'bg-gray-500',
  bgSoft: 'bg-gray-500/10 dark:bg-gray-400/10',
  text: 'text-gray-700 dark:text-gray-300',
  border: 'border-gray-500/30',
};

export function colorClasses(color: string | undefined): ColorClasses {
  return (color && PALETTE[color]) || FALLBACK;
}
